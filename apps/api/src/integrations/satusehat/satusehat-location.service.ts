import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  LocationSummary,
  SatusehatLocationPreview,
  SatusehatLocationSyncResult,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import type { IntegrationSyncContext } from '../integration.types';
import {
  addSatusehatSyncMetadata,
  classifySatusehatSyncFailure,
  retryAttemptFromContext,
} from './satusehat-sync-log';
import { SatusehatLocationTransformer } from './location-transformer';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_LOCATION_RESOURCE_TYPE,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  LOCATION_RESOURCE_TYPE,
  ORGANIZATION_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-location.constants';
import { toLocationSummary } from './satusehat-location.mapper';

interface LocationContext {
  location: LocationSummary;
  organizationExternalId: string;
  organizationDisplay: string;
  parentExternalId?: string;
  parentDisplay?: string;
  externalResourceId?: string;
}

@Injectable()
export class SatusehatLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
  ) {}

  async previewLocation(
    localResourceId: string,
  ): Promise<SatusehatLocationPreview> {
    const context = await this.getContext(localResourceId);
    const payload = SatusehatLocationTransformer.transform(context);

    return {
      localResourceId,
      operation: context.externalResourceId ? 'UPDATE' : 'CREATE',
      externalResourceId: context.externalResourceId,
      payload,
    };
  }

  async syncLocation(
    localResourceId: string,
    context?: IntegrationSyncContext,
  ): Promise<SatusehatLocationSyncResult> {
    const preview = await this.previewLocation(localResourceId);
    const retryAttempt = retryAttemptFromContext(context);
    const attemptMetadata = {
      retryAttempt,
      ...(context?.retryOfLogId ? { retryOfLogId: context.retryOfLogId } : {}),
    };
    const syncLog = await this.prisma.satusehatSyncLog.create({
      data: {
        resourceType: LOCATION_RESOURCE_TYPE,
        resourceId: localResourceId,
        status: 'PENDING',
        payload: addSatusehatSyncMetadata(
          preview.payload,
          attemptMetadata,
        ) as Prisma.InputJsonValue,
      },
    });

    try {
      const response =
        preview.operation === 'UPDATE'
          ? await this.fhir.updateLocation(
              preview.externalResourceId!,
              preview.payload,
            )
          : await this.fhir.createLocation(preview.payload);
      const externalResourceId =
        this.extractResourceId(response) || preview.externalResourceId;

      if (!externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_LOCATION_ID_MISSING',
          message: 'Response Location SATUSEHAT tidak memiliki id',
        });
      }

      const config = this.readConfig();
      await this.upsertExternalLink(
        localResourceId,
        externalResourceId,
        config.environment,
      );
      await this.prisma.satusehatSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          satusehatId: externalResourceId,
          errorMessage: null,
        },
      });

      return {
        ...preview,
        externalResourceId,
        syncedRemotely: true,
        syncLogId: syncLog.id,
        response,
      };
    } catch (error) {
      await this.markSyncFailed(
        syncLog.id,
        error,
        addSatusehatSyncMetadata(preview.payload, {
          ...attemptMetadata,
          ...classifySatusehatSyncFailure(error, retryAttempt),
        }) as Prisma.InputJsonValue,
      );
      throw this.toHttpError(error);
    }
  }

  private async getContext(localResourceId: string): Promise<LocationContext> {
    const record = await this.prisma.location.findUnique({
      where: { id: localResourceId },
      include: { organization: true, parent: true },
    });
    if (!record) throw new NotFoundException('Lokasi tidak ditemukan');
    const normalizedLocation = toLocationSummary(record);
    this.ensureCoordinates(normalizedLocation);

    const config = this.readConfig();
    const organizationLink = await this.findExternalLink(
      ORGANIZATION_RESOURCE_TYPE,
      LOCAL_ORGANIZATION_RESOURCE_TYPE,
      record.organizationId,
      config.environment,
    );
    if (!organizationLink) {
      throw new ConflictException({
        code: 'SATUSEHAT_ORGANIZATION_NOT_SYNCED',
        message:
          'Organisasi pengelola harus disinkronkan ke SATUSEHAT terlebih dahulu',
      });
    }

    let parentExternalId: string | undefined;
    if (record.parentId) {
      const parentLink = await this.findExternalLink(
        LOCATION_RESOURCE_TYPE,
        LOCAL_LOCATION_RESOURCE_TYPE,
        record.parentId,
        config.environment,
      );
      if (!parentLink) {
        throw new ConflictException({
          code: 'SATUSEHAT_LOCATION_PARENT_NOT_SYNCED',
          message:
            'Lokasi induk harus disinkronkan ke SATUSEHAT terlebih dahulu',
        });
      }
      parentExternalId = parentLink.externalResourceId;
    }

    const locationLink = await this.findExternalLink(
      LOCATION_RESOURCE_TYPE,
      LOCAL_LOCATION_RESOURCE_TYPE,
      localResourceId,
      config.environment,
    );

    return {
      location: normalizedLocation,
      organizationExternalId: organizationLink.externalResourceId,
      organizationDisplay: record.organization.name,
      parentExternalId,
      parentDisplay: record.parent?.name,
      externalResourceId: locationLink?.externalResourceId,
    };
  }

  private async findExternalLink(
    resourceType: string,
    localResourceType: string,
    localResourceId: string,
    environment: string,
  ) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType,
          localResourceType,
          localResourceId,
        },
      },
    });
  }

  private async upsertExternalLink(
    localResourceId: string,
    externalResourceId: string,
    environment: string,
  ): Promise<void> {
    await this.prisma.externalResourceLink.upsert({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: LOCATION_RESOURCE_TYPE,
          localResourceType: LOCAL_LOCATION_RESOURCE_TYPE,
          localResourceId,
        },
      },
      create: {
        provider: SATUSEHAT_PROVIDER,
        environment,
        resourceType: LOCATION_RESOURCE_TYPE,
        localResourceType: LOCAL_LOCATION_RESOURCE_TYPE,
        localResourceId,
        externalResourceId,
        lastSyncedAt: new Date(),
      },
      update: {
        externalResourceId,
        lastSyncedAt: new Date(),
      },
    });
  }

  private async markSyncFailed(
    syncLogId: string,
    error: unknown,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.satusehatSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'FAILED',
        errorMessage: this.safeErrorMessage(error),
        payload,
      },
    });
  }

  private readConfig(): { environment: string } {
    return {
      environment:
        process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT,
    };
  }

  private ensureCoordinates(location: LocationSummary): void {
    const latitude = location.latitude;
    const longitude = location.longitude;
    const hasLatitude = latitude !== undefined;
    const hasLongitude = longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_COORDINATES_PAIR_REQUIRED',
        message:
          'Latitude dan longitude harus diisi bersama-sama sebelum Location disinkronkan',
      });
    }
    if (
      hasLatitude &&
      hasLongitude &&
      (!Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180)
    ) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_COORDINATES_INVALID',
        message: 'Latitude atau longitude Location berada di luar rentang valid',
      });
    }
    if (
      location.altitude !== undefined &&
      !Number.isFinite(location.altitude)
    ) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_ALTITUDE_INVALID',
        message: 'Altitude Location harus berupa angka yang valid',
      });
    }
  }

  private extractResourceId(response: unknown): string | undefined {
    if (!this.isRecord(response)) return undefined;
    return typeof response.id === 'string' && response.id.trim()
      ? response.id
      : undefined;
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof BadGatewayException) return error;
    if (error instanceof ConflictException) return error;
    if (error instanceof NotFoundException) return error;
    if (error instanceof ServiceUnavailableException) return error;
    if (error instanceof SatusehatFhirError) {
      return new BadGatewayException(error.toContract());
    }
    return new BadGatewayException({
      code: 'SATUSEHAT_LOCATION_SYNC_FAILED',
      message: 'Sinkronisasi Location ke SATUSEHAT gagal',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SatusehatFhirError) return error.message;
    if (error instanceof Error) return error.message;
    return 'Sinkronisasi Location ke SATUSEHAT gagal';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
