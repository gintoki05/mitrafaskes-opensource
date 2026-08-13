import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  SatusehatEncounterPreview,
  SatusehatEncounterSyncResult,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  ENCOUNTER_FHIR_PROFILE_VERSION,
  ENCOUNTER_MAPPER_VERSION,
  ENCOUNTER_PLAYBOOK_VERSION,
  ENCOUNTER_RESOURCE_TYPE,
  LOCAL_ENCOUNTER_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-encounter.constants';
import { SatusehatEncounterPreflightService } from './satusehat-encounter-preflight.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';

@Injectable()
export class SatusehatEncounterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preflight: SatusehatEncounterPreflightService,
    private readonly fhir: SatusehatFhirClient,
  ) {}

  async previewEncounter(
    localResourceId: string,
  ): Promise<SatusehatEncounterPreview> {
    return this.preflight.previewEncounter(localResourceId);
  }

  async syncEncounter(
    localResourceId: string,
  ): Promise<SatusehatEncounterSyncResult> {
    const environment = this.readEnvironment();
    const syncLog = await this.prisma.satusehatSyncLog.create({
      data: {
        resourceType: ENCOUNTER_RESOURCE_TYPE,
        resourceId: localResourceId,
        status: 'PENDING',
        payload: this.buildLogPayload(localResourceId, environment),
      },
    });

    try {
      const preview = await this.preflight.preparePreview(
        localResourceId,
        environment,
      );
      await this.prisma.satusehatSyncLog.update({
        where: { id: syncLog.id },
        data: {
          payload: this.buildLogPayload(localResourceId, environment, preview),
        },
      });

      const response =
        preview.operation === 'UPDATE'
          ? await this.fhir.updateEncounter(
              preview.externalResourceId!,
              preview.payload,
            )
          : await this.fhir.createEncounter(preview.payload);
      const responseResourceId = this.extractResourceId(response);
      if (
        preview.operation === 'UPDATE' &&
        responseResourceId &&
        responseResourceId !== preview.externalResourceId
      ) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_ENCOUNTER_REMOTE_ID_MISMATCH',
          message:
            'SATUSEHAT mengembalikan ID Encounter yang berbeda dari linkage tersimpan.',
        });
      }
      const externalResourceId =
        preview.operation === 'UPDATE'
          ? preview.externalResourceId
          : responseResourceId;
      if (!externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_ENCOUNTER_ID_MISSING',
          message: 'Response Encounter SATUSEHAT tidak memiliki id.',
        });
      }

      const syncedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.externalResourceLink.upsert({
          where: {
            localResourceScope: {
              provider: SATUSEHAT_PROVIDER,
              environment,
              resourceType: ENCOUNTER_RESOURCE_TYPE,
              localResourceType: LOCAL_ENCOUNTER_RESOURCE_TYPE,
              localResourceId,
            },
          },
          create: {
            provider: SATUSEHAT_PROVIDER,
            environment,
            resourceType: ENCOUNTER_RESOURCE_TYPE,
            localResourceType: LOCAL_ENCOUNTER_RESOURCE_TYPE,
            localResourceId,
            externalResourceId,
            lastSyncedAt: syncedAt,
          },
          update: {
            externalResourceId,
            lastSyncedAt: syncedAt,
          },
        }),
        this.prisma.satusehatSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'SUCCESS',
            satusehatId: externalResourceId,
            errorMessage: null,
          },
        }),
      ]);

      return {
        ...preview,
        externalResourceId,
        syncedRemotely: true,
        syncLogId: syncLog.id,
        response,
      };
    } catch (error) {
      await this.markSyncFailed(syncLog.id, error);
      throw this.toHttpError(error);
    }
  }

  private buildLogPayload(
    localResourceId: string,
    environment: string,
    preview?: SatusehatEncounterPreview,
  ): Prisma.InputJsonValue {
    return {
      metadata: {
        provider: SATUSEHAT_PROVIDER,
        environment,
        localResourceType: LOCAL_ENCOUNTER_RESOURCE_TYPE,
        localResourceId,
        resourceType: ENCOUNTER_RESOURCE_TYPE,
        mapperVersion: ENCOUNTER_MAPPER_VERSION,
        fhirProfileVersion: ENCOUNTER_FHIR_PROFILE_VERSION,
        playbookVersion: ENCOUNTER_PLAYBOOK_VERSION,
        operation: preview?.operation ?? 'PREFLIGHT',
      },
      ...(preview
        ? { resource: preview.payload as unknown as Prisma.InputJsonValue }
        : {}),
    };
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }

  private async markSyncFailed(
    syncLogId: string,
    error: unknown,
  ): Promise<void> {
    await this.prisma.satusehatSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'FAILED',
        errorMessage: this.safeErrorMessage(error),
      },
    });
  }

  private extractResourceId(response: unknown): string | undefined {
    if (!this.isRecord(response)) return undefined;
    return typeof response.id === 'string' && response.id.trim()
      ? response.id
      : undefined;
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof HttpException) return error;
    if (error instanceof SatusehatFhirError) {
      return new BadGatewayException(error.toContract());
    }
    return new BadGatewayException({
      code: 'SATUSEHAT_ENCOUNTER_SYNC_FAILED',
      message: 'Sinkronisasi Encounter ke SATUSEHAT gagal.',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SatusehatFhirError) {
      const status = error.httpStatus ? `, HTTP ${error.httpStatus}` : '';
      return `Request Encounter SATUSEHAT gagal (${error.code}${status}).`;
    }
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (this.isRecord(response) && typeof response.message === 'string') {
        return response.message.slice(0, 500);
      }
    }
    return 'Sinkronisasi Encounter ke SATUSEHAT gagal.';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
