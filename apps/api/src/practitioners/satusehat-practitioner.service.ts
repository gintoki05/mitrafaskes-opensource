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
  SatusehatPractitionerLookupQuery,
  SatusehatPractitionerMutationResponse,
  SatusehatPractitionerRemoteSummary,
  SatusehatPractitionerSearchResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from '../satusehat/satusehat-fhir.client';
import { PractitionersService } from './practitioners.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_PRACTITIONER_RESOURCE_TYPE,
  PRACTITIONER_NIK_SYSTEM,
  PRACTITIONER_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './practitioner.constants';
import {
  parseRemotePractitioner,
  parseSearchResponse,
  toRemoteSummary,
} from './satusehat-practitioner.remote';

@Injectable()
export class SatusehatPractitionerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
    private readonly practitioners: PractitionersService,
  ) {}

  async searchForLocal(
    localResourceId: string,
  ): Promise<SatusehatPractitionerSearchResponse> {
    try {
      const practitioner =
        await this.practitioners.getPractitionerForSatusehat(localResourceId);
      const response = await this.fhir.searchPractitioners({
        identifier: `${PRACTITIONER_NIK_SYSTEM}|${practitioner.nik}`,
      });
      return this.toSearchResponse(response);
    } catch (error) {
      throw this.toHttpError(error, 'SATUSEHAT_PRACTITIONER_SEARCH_FAILED');
    }
  }

  async lookupForDraft(
    query: unknown,
  ): Promise<SatusehatPractitionerSearchResponse> {
    try {
      const { identifierType, identifier } = this.readLookupQuery(query);
      const response =
        identifierType === 'NIK'
          ? await this.fhir.searchPractitioners({
              identifier: `${PRACTITIONER_NIK_SYSTEM}|${identifier}`,
            })
          : await this.fhir.getPractitioner(identifier);

      return this.toSearchResponse(response);
    } catch (error) {
      throw this.toHttpError(error, 'SATUSEHAT_PRACTITIONER_LOOKUP_FAILED');
    }
  }

  async linkExisting(
    localResourceId: string,
    input: unknown,
  ): Promise<SatusehatPractitionerMutationResponse> {
    let syncLogId: string | undefined;

    try {
      const externalResourceId = this.readExternalResourceId(input);
      const practitioner =
        await this.practitioners.getPractitionerForSatusehat(localResourceId);
      const environment = this.readEnvironment();
      const currentLink = await this.findLocalLink(
        localResourceId,
        environment,
      );

      if (
        currentLink &&
        currentLink.externalResourceId !== externalResourceId
      ) {
        throw new ConflictException({
          code: 'SATUSEHAT_PRACTITIONER_LOCAL_LINK_MISMATCH',
          message:
            'Tenaga kesehatan lokal sudah terhubung ke Practitioner SATUSEHAT lain.',
        });
      }

      const syncLog = await this.prisma.satusehatSyncLog.create({
        data: {
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          resourceId: localResourceId,
          status: 'PENDING',
          payload: {
            resourceType: PRACTITIONER_RESOURCE_TYPE,
            id: externalResourceId,
            operation: 'LINK_EXISTING',
          } as Prisma.InputJsonValue,
        },
      });
      syncLogId = syncLog.id;

      const response = await this.fhir.getPractitioner(externalResourceId);
      const remote = parseRemotePractitioner(response);
      if (remote.externalResourceId !== externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_PRACTITIONER_ID_MISMATCH',
          message:
            'ID Practitioner dari SATUSEHAT tidak sesuai dengan resource yang diminta.',
        });
      }

      const existingLink = await this.practitioners.findLinkageByExternalId(
        externalResourceId,
        environment,
      );
      if (existingLink && existingLink.localResourceId !== localResourceId) {
        throw new ConflictException({
          code: 'SATUSEHAT_PRACTITIONER_ALREADY_LINKED',
          message: 'Practitioner SATUSEHAT sudah terhubung ke pengguna lain.',
          localResourceId: existingLink.localResourceId,
        });
      }

      await this.upsertLink(
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
        practitioner: await this.practitioners.findById(localResourceId),
        remote: toRemoteSummary(remote, localResourceId),
      };
    } catch (error) {
      if (syncLogId) await this.markSyncFailed(syncLogId, error);
      throw this.toHttpError(error, 'SATUSEHAT_PRACTITIONER_LINK_FAILED');
    }
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
        resourceType: PRACTITIONER_RESOURCE_TYPE,
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

  private async toSearchResponse(
    response: unknown,
  ): Promise<SatusehatPractitionerSearchResponse> {
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

  private async findLocalLink(localResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
          localResourceId,
        },
      },
    });
  }

  private async upsertLink(
    localResourceId: string,
    externalResourceId: string,
    environment: string,
  ): Promise<void> {
    await this.prisma.externalResourceLink.upsert({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
          localResourceId,
        },
      },
      create: {
        provider: SATUSEHAT_PROVIDER,
        environment,
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
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

  private async markSyncFailed(syncLogId: string, error: unknown): Promise<void> {
    try {
      await this.prisma.satusehatSyncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          errorMessage: this.safeErrorMessage(error),
        },
      });
    } catch {
      // Preserve the original SATUSEHAT error when logging itself fails.
    }
  }

  private readExternalResourceId(input: unknown): string {
    const body = isRecord(input) ? input : {};
    const externalResourceId = optionalText(body.externalResourceId);
    if (!externalResourceId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_EXTERNAL_ID_REQUIRED',
        message: 'ID Practitioner SATUSEHAT wajib diisi.',
      });
    }
    return externalResourceId;
  }

  private readLookupQuery(input: unknown): SatusehatPractitionerLookupQuery {
    const query = isRecord(input) ? input : {};
    const identifierType = query.identifierType;
    const identifier = optionalText(query.identifier);

    if (identifierType !== 'NIK' && identifierType !== 'IHS') {
      throw new BadRequestException({
        code: 'SATUSEHAT_PRACTITIONER_LOOKUP_TYPE_INVALID',
        message: 'Jenis identitas pencarian harus NIK atau Nomor IHS.',
      });
    }
    if (!identifier) {
      throw new BadRequestException({
        code: 'SATUSEHAT_PRACTITIONER_LOOKUP_IDENTIFIER_REQUIRED',
        message: `${identifierType === 'NIK' ? 'NIK' : 'Nomor IHS'} wajib diisi.`,
      });
    }
    if (identifierType === 'NIK' && !/^\d{16}$/.test(identifier)) {
      throw new BadRequestException({
        code: 'SATUSEHAT_PRACTITIONER_LOOKUP_NIK_INVALID',
        message: 'NIK harus terdiri dari 16 digit.',
      });
    }
    if (identifierType === 'IHS' && !/^\d{8,20}$/.test(identifier)) {
      throw new BadRequestException({
        code: 'SATUSEHAT_PRACTITIONER_LOOKUP_IHS_INVALID',
        message: 'Nomor IHS harus terdiri dari 8 sampai 20 digit.',
      });
    }

    return { identifierType, identifier };
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }

  private toHttpError(error: unknown, fallbackCode: string): Error {
    if (error instanceof BadRequestException) return error;
    if (error instanceof BadGatewayException) return error;
    if (error instanceof ConflictException) return error;
    if (error instanceof NotFoundException) return error;
    if (error instanceof ServiceUnavailableException) return error;
    if (error instanceof SatusehatFhirError) {
      return new BadGatewayException({
        code: error.code,
        message: error.message,
        httpStatus: error.httpStatus,
      });
    }
    return new BadGatewayException({
      code: fallbackCode,
      message: 'Operasi Practitioner SATUSEHAT gagal.',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SatusehatFhirError) return error.message;
    if (error instanceof Error) return error.message;
    return 'Operasi Practitioner SATUSEHAT gagal.';
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
