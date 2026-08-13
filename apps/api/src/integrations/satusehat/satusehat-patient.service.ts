import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  SatusehatPatientLookupQuery,
  SatusehatPatientMutationResponse,
  SatusehatPatientPreview,
  SatusehatPatientRemoteSummary,
  SatusehatPatientSearchResponse,
  SatusehatPatientSyncResult,
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
import { PatientsService } from '../../patients/patients.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_PATIENT_RESOURCE_TYPE,
  PATIENT_IHS_SYSTEM,
  PATIENT_NIK_SYSTEM,
  PATIENT_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './patient.constants';
import {
  toSatusehatPatientPatch,
  toSatusehatPatientPayload,
} from './satusehat-patient.mapper';
import {
  parseRemotePatient,
  parseSearchResponse,
  toRemoteSummary,
} from './satusehat-patient.remote';

@Injectable()
export class SatusehatPatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
    private readonly patients: PatientsService,
  ) {}

  async lookupForDraft(
    query: unknown,
  ): Promise<SatusehatPatientSearchResponse> {
    try {
      const { identifierType, identifier } = this.readLookupQuery(query);
      const response =
        identifierType === 'NIK'
          ? await this.fhir.searchPatients({
              identifier: `${PATIENT_NIK_SYSTEM}|${identifier}`,
            })
          : await this.fhir.getPatient(identifier);
      return this.toSearchResponse(response);
    } catch (error) {
      throw this.toHttpError(error, 'SATUSEHAT_PATIENT_LOOKUP_FAILED');
    }
  }

  async previewPatient(localResourceId: string): Promise<SatusehatPatientPreview> {
    const patient = await this.patients.getPatientForExternalIntegration(localResourceId);
    const environment = this.readEnvironment();
    const link = await this.findLocalLink(localResourceId, environment);

    return {
      localResourceId,
      operation: link ? 'UPDATE' : 'CREATE',
      externalResourceId: link?.externalResourceId,
      payload: link
        ? toSatusehatPatientPatch(patient)
        : toSatusehatPatientPayload(patient),
    };
  }

  async syncPatient(
    localResourceId: string,
    context?: IntegrationSyncContext,
  ): Promise<SatusehatPatientSyncResult> {
    const preview = await this.previewPatient(localResourceId);
    const retryAttempt = retryAttemptFromContext(context);
    const attemptMetadata = {
      retryAttempt,
      ...(context?.retryOfLogId ? { retryOfLogId: context.retryOfLogId } : {}),
    };
    const syncLog = await this.prisma.satusehatSyncLog.create({
      data: {
        resourceType: PATIENT_RESOURCE_TYPE,
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
          ? await this.fhir.patchPatient(
              preview.externalResourceId!,
              preview.payload,
            )
          : await this.fhir.createPatient(preview.payload);
      const externalResourceId =
        this.extractResourceId(response) || preview.externalResourceId;
      if (!externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_PATIENT_ID_MISSING',
          message: 'Response Patient SATUSEHAT tidak memiliki ID IHS',
        });
      }

      await this.upsertExternalLink(
        localResourceId,
        externalResourceId,
        this.readEnvironment(),
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
      throw this.toHttpError(error, 'SATUSEHAT_PATIENT_SYNC_FAILED');
    }
  }

  async linkExisting(
    localResourceId: string,
    input: unknown,
  ): Promise<SatusehatPatientMutationResponse> {
    let syncLogId: string | undefined;

    try {
      const externalResourceId = this.readExternalResourceId(input);
      const patient = await this.patients.getPatientForExternalIntegration(localResourceId);
      const environment = this.readEnvironment();
      const currentLink = await this.findLocalLink(localResourceId, environment);

      if (
        currentLink &&
        currentLink.externalResourceId !== externalResourceId
      ) {
        throw new ConflictException({
          code: 'SATUSEHAT_PATIENT_LOCAL_LINK_MISMATCH',
          message:
            'Pasien lokal sudah terhubung ke Patient SATUSEHAT yang berbeda.',
        });
      }

      const syncLog = await this.prisma.satusehatSyncLog.create({
        data: {
          resourceType: PATIENT_RESOURCE_TYPE,
          resourceId: localResourceId,
          status: 'PENDING',
          payload: {
            resourceType: PATIENT_RESOURCE_TYPE,
            id: externalResourceId,
            operation: 'LINK_EXISTING',
            localPayload: toSatusehatPatientPayload(patient),
          } as unknown as Prisma.InputJsonValue,
        },
      });
      syncLogId = syncLog.id;

      const response = await this.fhir.getPatient(externalResourceId);
      const remote = parseRemotePatient(response);
      if (remote.externalResourceId !== externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_PATIENT_ID_MISMATCH',
          message:
            'ID Patient dari SATUSEHAT tidak sesuai dengan resource yang diminta.',
        });
      }

      const existingLink = await this.findLinkageByExternalId(
        externalResourceId,
        environment,
      );
      if (existingLink && existingLink.localResourceId !== localResourceId) {
        throw new ConflictException({
          code: 'SATUSEHAT_PATIENT_ALREADY_LINKED',
          message: 'Patient SATUSEHAT sudah terhubung ke pasien lokal lain.',
          localResourceId: existingLink.localResourceId,
        });
      }

      await this.upsertExternalLink(
        localResourceId,
        externalResourceId,
        environment,
      );
      await this.prisma.satusehatSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          satusehatId: externalResourceId,
          payload: response as Prisma.InputJsonValue,
          errorMessage: null,
        },
      });

      return {
        operation: 'LINK_EXISTING',
        localResourceId,
        externalResourceId,
        patient: await this.patients.findByIdOrThrow(localResourceId),
        remote: toRemoteSummary(remote, localResourceId),
      };
    } catch (error) {
      if (syncLogId) await this.markSyncFailed(syncLogId, error);
      throw this.toHttpError(error, 'SATUSEHAT_PATIENT_LINK_FAILED');
    }
  }

  private async toSearchResponse(
    response: unknown,
  ): Promise<SatusehatPatientSearchResponse> {
    const remoteItems = parseSearchResponse(response);
    const links = await this.findLinksByExternalIds(
      remoteItems.map((item) => item.externalResourceId),
    );

    return {
      items: remoteItems.map((item) =>
        toRemoteSummary(item, links.get(item.externalResourceId)),
      ),
      total: remoteItems.length,
    };
  }

  private async findLinksByExternalIds(
    externalResourceIds: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (externalResourceIds.length === 0) return result;

    const records = await this.prisma.externalResourceLink.findMany({
      where: {
        provider: SATUSEHAT_PROVIDER,
        environment: this.readEnvironment(),
        resourceType: PATIENT_RESOURCE_TYPE,
        externalResourceId: { in: externalResourceIds },
      },
      select: {
        externalResourceId: true,
        localResourceId: true,
      },
    });
    for (const record of records) {
      result.set(record.externalResourceId, record.localResourceId);
    }
    return result;
  }

  private findLocalLink(localResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PATIENT_RESOURCE_TYPE,
          localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
          localResourceId,
        },
      },
    });
  }

  private findLinkageByExternalId(externalResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        externalResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PATIENT_RESOURCE_TYPE,
          externalResourceId,
        },
      },
    });
  }

  private upsertExternalLink(
    localResourceId: string,
    externalResourceId: string,
    environment: string,
  ) {
    return this.prisma.externalResourceLink.upsert({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PATIENT_RESOURCE_TYPE,
          localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
          localResourceId,
        },
      },
      create: {
        provider: SATUSEHAT_PROVIDER,
        environment,
        resourceType: PATIENT_RESOURCE_TYPE,
        localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
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
    payload?: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await this.prisma.satusehatSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          errorMessage: this.safeErrorMessage(error),
          ...(payload ? { payload } : {}),
        },
      });
    } catch {
      // Keep the remote error as the response if audit logging also fails.
    }
  }

  private readLookupQuery(input: unknown): SatusehatPatientLookupQuery {
    const query = isRecord(input) ? input : {};
    const identifierType = query.identifierType;
    const identifier = optionalText(query.identifier);

    if (identifierType !== 'NIK' && identifierType !== 'IHS') {
      throw new BadRequestException({
        code: 'SATUSEHAT_PATIENT_LOOKUP_TYPE_INVALID',
        message: 'Jenis identitas pencarian harus NIK atau Nomor IHS.',
      });
    }
    if (!identifier) {
      throw new BadRequestException({
        code: 'SATUSEHAT_PATIENT_LOOKUP_IDENTIFIER_REQUIRED',
        message: `${identifierType === 'NIK' ? 'NIK' : 'Nomor IHS'} wajib diisi.`,
      });
    }
    if (identifierType === 'NIK' && !/^\d{16}$/.test(identifier)) {
      throw new BadRequestException({
        code: 'SATUSEHAT_PATIENT_LOOKUP_NIK_INVALID',
        message: 'NIK pencarian SATUSEHAT harus terdiri dari 16 digit.',
      });
    }
    if (identifierType === 'IHS' && !/^[A-Za-z0-9.-]{1,64}$/.test(identifier)) {
      throw new BadRequestException({
        code: 'SATUSEHAT_PATIENT_LOOKUP_IHS_INVALID',
        message: 'Nomor IHS harus berupa ID Patient SATUSEHAT yang valid.',
      });
    }
    return { identifierType, identifier };
  }

  private readExternalResourceId(input: unknown): string {
    const body = isRecord(input) ? input : {};
    const externalResourceId = optionalText(body.externalResourceId);
    if (!externalResourceId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_EXTERNAL_ID_REQUIRED',
        message: 'ID Patient SATUSEHAT wajib diisi.',
      });
    }
    return externalResourceId;
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }

  private extractResourceId(response: unknown): string | undefined {
    if (!isRecord(response)) return undefined;
    const identifiers = Array.isArray(response.identifier)
      ? response.identifier
      : [];
    const ihs = identifiers.find(
      (identifier) =>
        isRecord(identifier) && identifier.system === PATIENT_IHS_SYSTEM,
    );
    const ihsValue = isRecord(ihs) ? optionalText(ihs.value) : undefined;
    return ihsValue ?? optionalText(response.id);
  }

  private toHttpError(error: unknown, fallbackCode: string): Error {
    if (
      error instanceof BadRequestException ||
      error instanceof BadGatewayException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof ServiceUnavailableException
    ) {
      return error;
    }
    if (error instanceof SatusehatFhirError) {
      return new BadGatewayException(error.toContract());
    }
    return new BadGatewayException({
      code: fallbackCode,
      message: 'Operasi Patient SATUSEHAT gagal.',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SatusehatFhirError) return error.message;
    if (error instanceof Error) return error.message;
    return 'Operasi Patient SATUSEHAT gagal.';
  }
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
