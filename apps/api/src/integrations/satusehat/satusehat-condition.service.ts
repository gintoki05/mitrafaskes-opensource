import { BadGatewayException, HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  SatusehatConditionPreview,
  SatusehatConditionSyncResult,
} from './satusehat-condition.contract';
import { PrismaService } from '../../database/prisma.service';
import type { IntegrationSyncContext } from '../integration.types';
import {
  CONDITION_FHIR_PROFILE_VERSION,
  CONDITION_MAPPER_VERSION,
  CONDITION_PLAYBOOK_VERSION,
  CONDITION_PROVIDER,
  CONDITION_RESOURCE_TYPE,
  DEFAULT_CONDITION_ENVIRONMENT,
  LOCAL_CONDITION_RESOURCE_TYPE,
} from './satusehat-condition.constants';
import { SatusehatConditionPreflightService } from './satusehat-condition-preflight.service';
import { SatusehatConditionEncounterLifecycleService } from './satusehat-condition-encounter-lifecycle.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import {
  classifySatusehatSyncFailure,
  retryAttemptFromContext,
} from './satusehat-sync-log';

@Injectable()
export class SatusehatConditionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preflight: SatusehatConditionPreflightService,
    private readonly fhir: SatusehatFhirClient,
    private readonly encounterLifecycle?: SatusehatConditionEncounterLifecycleService,
  ) {}

  previewCondition(
    localResourceId: string,
  ): Promise<SatusehatConditionPreview> {
    return this.preflight.previewCondition(localResourceId);
  }

  async syncCondition(
    localResourceId: string,
    context?: IntegrationSyncContext,
  ): Promise<SatusehatConditionSyncResult> {
    const environment = this.readEnvironment();
    const retryAttempt = retryAttemptFromContext(context);
    const syncLog = await this.prisma.satusehatSyncLog.create({
      data: {
        resourceType: CONDITION_RESOURCE_TYPE,
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

    let preview: SatusehatConditionPreview | undefined;
    let encounterBootstrapSyncLogId: string | undefined;
    try {
      const prepared = this.encounterLifecycle
        ? await this.encounterLifecycle.preparePreview(
            localResourceId,
            environment,
          )
        : {
            preview: await this.preflight.preparePreview(
              localResourceId,
              environment,
            ),
          };
      preview = prepared.preview;
      encounterBootstrapSyncLogId = prepared.encounterBootstrapSyncLogId;
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
          ? await this.fhir.updateCondition(
              preview.externalResourceId!,
              preview.payload,
            )
          : await this.fhir.createCondition(preview.payload);
      const responseResourceId = this.extractResourceId(response);
      if (
        preview.operation === 'UPDATE' &&
        responseResourceId &&
        responseResourceId !== preview.externalResourceId
      ) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_CONDITION_REMOTE_ID_MISMATCH',
          message:
            'SATUSEHAT mengembalikan ID Condition yang berbeda dari linkage tersimpan.',
        });
      }
      const externalResourceId =
        preview.operation === 'UPDATE'
          ? preview.externalResourceId
          : responseResourceId;
      if (!externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_CONDITION_ID_MISSING',
          message: 'Response Condition SATUSEHAT tidak memiliki id.',
        });
      }

      const syncedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.externalResourceLink.upsert({
          where: {
            localResourceScope: {
              provider: CONDITION_PROVIDER,
              environment,
              resourceType: CONDITION_RESOURCE_TYPE,
              localResourceType: LOCAL_CONDITION_RESOURCE_TYPE,
              localResourceId,
            },
          },
          create: {
            provider: CONDITION_PROVIDER,
            environment,
            resourceType: CONDITION_RESOURCE_TYPE,
            localResourceType: LOCAL_CONDITION_RESOURCE_TYPE,
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

      let encounterSyncLogId: string | undefined;
      if (this.encounterLifecycle) {
        encounterSyncLogId = await this.encounterLifecycle.projectFinished(
          preview.encounterLocalResourceId,
        );
      }

      const { payload: rawPayload, ...safePreview } = preview;
      void rawPayload;
      return {
        ...safePreview,
        externalResourceId,
        syncedRemotely: true,
        syncLogId: syncLog.id,
        // Keep the gateway response metadata-only; raw remote payloads remain
        // available exclusively through the Admin-protected monitoring path.
        response: {
          resourceType: CONDITION_RESOURCE_TYPE,
          id: externalResourceId,
        },
        ...(encounterBootstrapSyncLogId ? { encounterBootstrapSyncLogId } : {}),
        ...(encounterSyncLogId ? { encounterSyncLogId } : {}),
      };
    } catch (error) {
      const failure = this.isMappingFailure(error)
        ? {
            ...classifySatusehatSyncFailure(error, retryAttempt),
            errorCategory: 'TERMINOLOGY' as const,
            retryable: false,
            operatorAction: 'FIX_TERMINOLOGY' as const,
          }
        : classifySatusehatSyncFailure(error, retryAttempt);
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
    preview?: SatusehatConditionPreview,
    metadata: Record<string, unknown> = {},
  ): Prisma.InputJsonValue {
    return {
      metadata: {
        provider: CONDITION_PROVIDER,
        environment,
        localResourceType: LOCAL_CONDITION_RESOURCE_TYPE,
        localResourceId,
        resourceType: CONDITION_RESOURCE_TYPE,
        mapperVersion: CONDITION_MAPPER_VERSION,
        fhirProfileVersion: CONDITION_FHIR_PROFILE_VERSION,
        playbookVersion: CONDITION_PLAYBOOK_VERSION,
        operation: preview?.operation ?? 'PREFLIGHT',
        ...(preview
          ? {
              rank: preview.rank,
              category: preview.category,
              mappingStatus: preview.mappingStatus,
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
      code: 'SATUSEHAT_CONDITION_SYNC_FAILED',
      message: 'Sinkronisasi Condition ke SATUSEHAT gagal.',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SatusehatFhirError) {
      const status = error.httpStatus ? `, HTTP ${error.httpStatus}` : '';
      return `Request Condition SATUSEHAT gagal (${error.code}${status}).`;
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
    return 'Sinkronisasi Condition SATUSEHAT gagal.';
  }

  private mappingFailureMetadata(error: unknown): Record<string, unknown> {
    if (!this.isMappingFailure(error)) return {};
    return { mappingStatus: 'mapping-required' };
  }

  private isMappingFailure(error: unknown): boolean {
    if (!(error instanceof HttpException)) return false;
    const response = error.getResponse();
    return (
      this.isRecord(response) &&
      (response.code === 'SATUSEHAT_CONDITION_MAPPING_REQUIRED' ||
        response.mappingStatus === 'mapping-required')
    );
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_CONDITION_ENVIRONMENT
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
