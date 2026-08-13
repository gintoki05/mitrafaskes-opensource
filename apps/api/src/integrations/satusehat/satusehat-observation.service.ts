import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  SatusehatObservationPreview,
  SatusehatObservationSyncResult,
} from './satusehat-observation.contract';
import { PrismaService } from '../../database/prisma.service';
import type { IntegrationSyncContext } from '../integration.types';
import {
  DEFAULT_OBSERVATION_ENVIRONMENT,
  LOCAL_OBSERVATION_RESOURCE_TYPE,
  OBSERVATION_FHIR_PROFILE_VERSION,
  OBSERVATION_MAPPER_VERSION,
  OBSERVATION_PLAYBOOK_VERSION,
  OBSERVATION_PROVIDER,
  OBSERVATION_RESOURCE_TYPE,
} from './satusehat-observation.constants';
import { SatusehatObservationPreflightService } from './satusehat-observation-preflight.service';
import {
  SatusehatFhirError,
  SatusehatFhirClient,
} from './satusehat-fhir.client';
import {
  classifySatusehatSyncFailure,
  retryAttemptFromContext,
} from './satusehat-sync-log';

@Injectable()
export class SatusehatObservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preflight: SatusehatObservationPreflightService,
    private readonly fhir: SatusehatFhirClient,
  ) {}

  previewObservation(
    localResourceId: string,
  ): Promise<SatusehatObservationPreview> {
    return this.preflight.previewObservation(localResourceId);
  }

  async syncObservation(
    localResourceId: string,
    context?: IntegrationSyncContext,
  ): Promise<SatusehatObservationSyncResult> {
    const environment = this.readEnvironment();
    const retryAttempt = retryAttemptFromContext(context);
    const syncLog = await this.prisma.satusehatSyncLog.create({
      data: {
        resourceType: OBSERVATION_RESOURCE_TYPE,
        resourceId: localResourceId,
        status: 'PENDING',
        payload: this.buildLogPayload(localResourceId, environment, undefined, {
          retryAttempt,
          ...(context?.retryOfLogId
            ? { retryOfLogId: context.retryOfLogId }
            : {}),
        }),
      },
    });

    let preview: SatusehatObservationPreview | undefined;
    try {
      preview = await this.preflight.preparePreview(
        localResourceId,
        environment,
      );
      await this.prisma.satusehatSyncLog.update({
        where: { id: syncLog.id },
        data: {
          payload: this.buildLogPayload(localResourceId, environment, preview, {
            retryAttempt,
            ...(context?.retryOfLogId
              ? { retryOfLogId: context.retryOfLogId }
              : {}),
          }),
        },
      });

      const response =
        preview.operation === 'UPDATE'
          ? await this.fhir.updateObservation(
              preview.externalResourceId!,
              preview.payload,
            )
          : await this.fhir.createObservation(preview.payload);
      const responseResourceId = this.extractResourceId(response);
      if (
        preview.operation === 'UPDATE' &&
        responseResourceId &&
        responseResourceId !== preview.externalResourceId
      ) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_OBSERVATION_REMOTE_ID_MISMATCH',
          message:
            'SATUSEHAT mengembalikan ID Observation yang berbeda dari linkage tersimpan.',
        });
      }
      const externalResourceId =
        preview.operation === 'UPDATE'
          ? preview.externalResourceId
          : responseResourceId;
      if (!externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_OBSERVATION_ID_MISSING',
          message: 'Response Observation SATUSEHAT tidak memiliki id.',
        });
      }

      const syncedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.externalResourceLink.upsert({
          where: {
            localResourceScope: {
              provider: OBSERVATION_PROVIDER,
              environment,
              resourceType: OBSERVATION_RESOURCE_TYPE,
              localResourceType: LOCAL_OBSERVATION_RESOURCE_TYPE,
              localResourceId,
            },
          },
          create: {
            provider: OBSERVATION_PROVIDER,
            environment,
            resourceType: OBSERVATION_RESOURCE_TYPE,
            localResourceType: LOCAL_OBSERVATION_RESOURCE_TYPE,
            localResourceId,
            externalResourceId,
            lastSyncedAt: syncedAt,
          },
          update: { externalResourceId, lastSyncedAt: syncedAt },
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

      const { payload: rawPayload, ...safePreview } = preview;
      void rawPayload;
      return {
        ...safePreview,
        externalResourceId,
        syncedRemotely: true,
        syncLogId: syncLog.id,
        response: {
          resourceType: OBSERVATION_RESOURCE_TYPE,
          id: externalResourceId,
        },
      };
    } catch (error) {
      const failure = this.classifyFailure(error, retryAttempt);
      await this.markSyncFailed(
        syncLog.id,
        error,
        this.buildLogPayload(localResourceId, environment, preview, {
          ...(context?.retryOfLogId
            ? { retryOfLogId: context.retryOfLogId }
            : {}),
          ...failure,
          ...this.mappingFailureMetadata(error),
        }),
      );
      throw this.toHttpError(error);
    }
  }

  private buildLogPayload(
    localResourceId: string,
    environment: string,
    preview?: SatusehatObservationPreview,
    metadata: Record<string, unknown> = {},
  ): Prisma.InputJsonValue {
    return {
      metadata: {
        provider: OBSERVATION_PROVIDER,
        environment,
        localResourceType: LOCAL_OBSERVATION_RESOURCE_TYPE,
        localResourceId,
        resourceType: OBSERVATION_RESOURCE_TYPE,
        mapperVersion: OBSERVATION_MAPPER_VERSION,
        fhirProfileVersion: OBSERVATION_FHIR_PROFILE_VERSION,
        playbookVersion: OBSERVATION_PLAYBOOK_VERSION,
        operation: preview?.operation ?? 'PREFLIGHT',
        ...(preview
          ? {
              mappingStatus: preview.mappingStatus,
              provenance: preview.provenance,
              valueType: preview.valueType,
            }
          : {}),
        ...metadata,
      },
      ...(preview
        ? { resource: preview.payload as unknown as Prisma.InputJsonValue }
        : {}),
    };
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
      code: 'SATUSEHAT_OBSERVATION_SYNC_FAILED',
      message: 'Sinkronisasi Observation ke SATUSEHAT gagal.',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SatusehatFhirError) {
      const status = error.httpStatus ? `, HTTP ${error.httpStatus}` : '';
      return `Request Observation SATUSEHAT gagal (${error.code}${status}).`;
    }
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (this.isRecord(response)) {
        const message = response.message;
        if (typeof message === 'string') return message.slice(0, 500);
        if (Array.isArray(message)) {
          return message
            .filter((item): item is string => typeof item === 'string')
            .join(' ')
            .slice(0, 500);
        }
      }
    }
    return 'Sinkronisasi Observation SATUSEHAT gagal.';
  }

  private mappingFailureMetadata(error: unknown): Record<string, unknown> {
    return this.isMappingFailure(error)
      ? { mappingStatus: 'mapping-required' }
      : {};
  }

  private classifyFailure(error: unknown, retryAttempt: number) {
    const classification = classifySatusehatSyncFailure(error, retryAttempt);
    if (this.isMappingFailure(error)) {
      return {
        ...classification,
        errorCategory: 'TERMINOLOGY' as const,
        retryable: false,
        operatorAction: 'FIX_TERMINOLOGY' as const,
      };
    }
    if (this.isDerivedSourceFailure(error)) {
      return {
        ...classification,
        errorCategory: 'REFERENCE_MISSING' as const,
        retryable: false,
        operatorAction: 'FIX_REFERENCE' as const,
      };
    }
    return classification;
  }

  private isMappingFailure(error: unknown): boolean {
    if (!(error instanceof HttpException)) return false;
    const response = error.getResponse();
    return (
      this.isRecord(response) &&
      (response.code === 'SATUSEHAT_OBSERVATION_MAPPING_REQUIRED' ||
        response.mappingStatus === 'mapping-required')
    );
  }

  private isDerivedSourceFailure(error: unknown): boolean {
    if (!(error instanceof HttpException)) return false;
    const response = error.getResponse();
    return (
      this.isRecord(response) &&
      response.code === 'SATUSEHAT_OBSERVATION_DERIVED_SOURCE_MISSING'
    );
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() ||
      DEFAULT_OBSERVATION_ENVIRONMENT
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
