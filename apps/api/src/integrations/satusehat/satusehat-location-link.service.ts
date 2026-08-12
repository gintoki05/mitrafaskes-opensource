import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  LocationSummary,
  SatusehatLocationLinkRequest,
  SatusehatLocationMutationResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_LOCATION_RESOURCE_TYPE,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  LOCATION_RESOURCE_TYPE,
  ORGANIZATION_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-location.constants';
import { toLocationSummary } from './satusehat-location.mapper';
import {
  parseRemoteLocation,
  type RemoteLocation,
} from './satusehat-location.remote';

interface LocationContext {
  location: LocationSummary;
  organizationExternalId: string;
  parentExternalId?: string;
}

@Injectable()
export class SatusehatLocationLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
  ) {}

  async linkExistingLocation(
    localResourceId: string,
    input: unknown,
  ): Promise<SatusehatLocationMutationResponse> {
    try {
      const externalResourceId = this.readExternalResourceId(input);
      const context = await this.getContext(localResourceId);
      const remote = parseRemoteLocation(
        await this.fhir.getLocation(externalResourceId),
      );
      const environment = this.readEnvironment();

      this.assertRemoteMatchesLocal(context, remote);
      await this.ensureExternalLinkAvailable(
        localResourceId,
        remote.externalResourceId,
        environment,
      );
      await this.upsertExternalLink(
        localResourceId,
        remote.externalResourceId,
        environment,
      );

      return {
        operation: 'LINK_EXISTING',
        localResourceId,
        externalResourceId: remote.externalResourceId,
        location: context.location,
      };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private async getContext(
    localResourceId: string,
  ): Promise<LocationContext> {
    const record = await this.prisma.location.findUnique({
      where: { id: localResourceId },
      include: { organization: true, parent: true },
    });
    if (!record) throw new NotFoundException('Lokasi tidak ditemukan');

    const environment = this.readEnvironment();
    const organizationLink = await this.findExternalLink(
      ORGANIZATION_RESOURCE_TYPE,
      LOCAL_ORGANIZATION_RESOURCE_TYPE,
      record.organizationId,
      environment,
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
        environment,
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

    return {
      location: toLocationSummary(record),
      organizationExternalId: organizationLink.externalResourceId,
      parentExternalId,
    };
  }

  private assertRemoteMatchesLocal(
    context: LocationContext,
    remote: RemoteLocation,
  ): void {
    if (
      !remote.managingOrganizationExternalResourceId ||
      remote.managingOrganizationExternalResourceId !==
        context.organizationExternalId
    ) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_ORGANIZATION_MISMATCH',
        message:
          'Location.managingOrganization SATUSEHAT tidak sesuai dengan organisasi lokal',
      });
    }

    if (context.parentExternalId !== remote.parentExternalResourceId) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_PARENT_MISMATCH',
        message:
          'Location.partOf SATUSEHAT tidak sesuai dengan parent lokal',
      });
    }
  }

  private async ensureExternalLinkAvailable(
    localResourceId: string,
    externalResourceId: string,
    environment: string,
  ): Promise<void> {
    const link = await this.findExternalLinkByExternalId(
      externalResourceId,
      environment,
    );
    if (link && link.localResourceId !== localResourceId) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_ALREADY_LINKED',
        message: 'Location SATUSEHAT sudah terhubung ke data lokal lain',
        localResourceId: link.localResourceId,
      });
    }
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

  private async findExternalLinkByExternalId(
    externalResourceId: string,
    environment: string,
  ) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        externalResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: LOCATION_RESOURCE_TYPE,
          externalResourceId,
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

  private readExternalResourceId(input: unknown): string {
    const body = this.isRecord(input) ? input : {};
    const externalResourceId = this.optionalText(body.externalResourceId);
    if (!externalResourceId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_EXTERNAL_ID_REQUIRED',
        message: 'ID Location SATUSEHAT wajib diisi',
      });
    }
    return externalResourceId;
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }

  private optionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized || undefined;
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof BadRequestException) return error;
    if (error instanceof BadGatewayException) return error;
    if (error instanceof ConflictException) return error;
    if (error instanceof NotFoundException) return error;
    if (error instanceof ServiceUnavailableException) return error;
    if (error instanceof SatusehatFhirError) {
      return new BadGatewayException(error.toContract());
    }
    return new BadGatewayException({
      code: 'SATUSEHAT_LOCATION_LINK_FAILED',
      message: 'Link Location SATUSEHAT gagal',
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
