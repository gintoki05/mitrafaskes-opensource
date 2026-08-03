import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  SatusehatOrganizationImportRequest,
  SatusehatOrganizationMutationResponse,
  SatusehatOrganizationRemoteSummary,
  SatusehatOrganizationSearchQuery,
  SatusehatOrganizationSearchResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from '../satusehat/satusehat-fhir.client';
import { MasterDataService } from './master-data.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  ORGANIZATION_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-organization.constants';
import {
  parseRemoteOrganization,
  parseSearchResponse,
  type RemoteOrganization,
  toRemoteSummary,
} from './satusehat-organization.remote';
import {
  MasterDataValidationError,
  validateOrganizationInput,
} from './master-data.validation';

@Injectable()
export class SatusehatOrganizationImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
    private readonly masterData: MasterDataService,
  ) {}

  async searchOrganizations(
    input: SatusehatOrganizationSearchQuery = {},
  ): Promise<SatusehatOrganizationSearchResponse> {
    const id = this.optionalText(input.id);
    const name = this.optionalText(input.name);
    const partOf = this.optionalText(input.partOf);
    const parentLocalId = this.optionalText(input.parentLocalId);

    if (!id && !name && !partOf && !parentLocalId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_ORGANIZATION_SEARCH_TERM_REQUIRED',
        message:
          'Isi ID, nama, atau organisasi induk untuk mencari Organization',
      });
    }

    try {
      let resolvedPartOf = partOf;
      if (parentLocalId) {
        const parent = await this.prisma.healthcareOrganization.findUnique({
          where: { id: parentLocalId },
        });
        if (!parent) {
          throw new NotFoundException('Organisasi induk lokal tidak ditemukan');
        }
        const config = this.readConfig();
        resolvedPartOf = await this.resolveParentExternalId(
          parent,
          config.organizationId,
          config.environment,
        );
      }

      const response = id
        ? await this.fhir.getOrganization(id)
        : await this.fhir.searchOrganizations({
            name,
            partof: resolvedPartOf,
          });
      const records = id
        ? [parseRemoteOrganization(response)]
        : parseSearchResponse(response);
      const environment = this.readEnvironment();
      const items = await Promise.all(
        records.map(async (record) => {
          const link = await this.findExternalLinkByExternalId(
            record.externalResourceId,
            environment,
          );
          return {
            ...toRemoteSummary(record),
            linkedLocalResourceId: link?.localResourceId,
          } satisfies SatusehatOrganizationRemoteSummary;
        }),
      );

      return { items, total: items.length };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async importOrganization(
    input: unknown,
  ): Promise<SatusehatOrganizationMutationResponse> {
    try {
      const request = this.readImportRequest(input);
      const remote = await this.getRemoteOrganization(
        request.externalResourceId,
      );
      const config = this.readConfig();
      const existingLink = await this.findExternalLinkByExternalId(
        remote.externalResourceId,
        config.environment,
      );

      if (existingLink) {
        throw new ConflictException({
          code: 'SATUSEHAT_ORGANIZATION_ALREADY_LINKED',
          message: 'Organization SATUSEHAT sudah terhubung ke data lokal',
          localResourceId: existingLink.localResourceId,
        });
      }

      const isRoot = !remote.parentExternalResourceId;
      if (isRoot && request.parentId) {
        throw new ConflictException({
          code: 'SATUSEHAT_ROOT_PARENT_NOT_ALLOWED',
          message:
            'Organization induk SATUSEHAT tidak boleh diimpor di bawah parent lokal',
        });
      }
      if (!isRoot && !request.parentId) {
        throw new ConflictException({
          code: 'SATUSEHAT_SUB_ORGANIZATION_PARENT_REQUIRED',
          message:
            'Sub-organisasi SATUSEHAT membutuhkan organisasi induk lokal',
        });
      }
      if (isRoot && remote.externalResourceId !== config.organizationId) {
        throw new ConflictException({
          code: 'SATUSEHAT_ROOT_ID_MISMATCH',
          message:
            'Organization induk yang diimpor harus sama dengan SATUSEHAT_ORGANIZATION_ID',
        });
      }

      if (!isRoot && request.parentId) {
        const parent = await this.prisma.healthcareOrganization.findUnique({
          where: { id: request.parentId },
        });
        if (!parent) {
          throw new NotFoundException('Organisasi induk lokal tidak ditemukan');
        }
        const parentExternalId = await this.resolveParentExternalId(
          parent,
          config.organizationId,
          config.environment,
        );
        if (remote.parentExternalResourceId !== parentExternalId) {
          throw new ConflictException({
            code: 'SATUSEHAT_PARENT_MISMATCH',
            message:
              'Organisasi induk lokal tidak sesuai dengan Organization.partOf SATUSEHAT',
          });
        }
      }

      const importedContact = this.readImportedContact(remote);
      const validated = this.validateImportedOrganization({
        code: request.code,
        name: remote.name,
        type: isRoot ? 'HEALTHCARE_FACILITY' : 'SUB_ORGANIZATION',
        parentId: request.parentId,
        addressText: remote.addressText,
        phone: importedContact.phone,
        email: importedContact.email,
        active: remote.active,
      });
      const organization = await this.masterData.createOrganization(validated);

      await this.upsertExternalLink(
        organization.id,
        remote.externalResourceId,
        config.environment,
      );

      return {
        operation: 'IMPORT',
        localResourceId: organization.id,
        externalResourceId: remote.externalResourceId,
        organization,
      };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private async getRemoteOrganization(
    externalResourceId: string,
  ): Promise<RemoteOrganization> {
    return parseRemoteOrganization(
      await this.fhir.getOrganization(externalResourceId),
    );
  }

  private async resolveParentExternalId(
    parent: { id: string; type: string; parentId: string | null },
    rootOrganizationId: string,
    environment: string,
  ): Promise<string> {
    if (parent.type === 'HEALTHCARE_FACILITY' && parent.parentId === null) {
      return rootOrganizationId;
    }
    const parentLink = await this.findExternalLink(parent.id, environment);
    if (!parentLink) {
      throw new ConflictException({
        code: 'SATUSEHAT_PARENT_NOT_SYNCED',
        message:
          'Organisasi induk harus disinkronkan ke SATUSEHAT terlebih dahulu',
      });
    }
    return parentLink.externalResourceId;
  }

  private validateImportedOrganization(input: unknown) {
    try {
      return validateOrganizationInput(input);
    } catch (error) {
      if (error instanceof MasterDataValidationError) {
        throw new BadRequestException({
          code: 'MASTER_DATA_VALIDATION_FAILED',
          message: error.message,
          errors: error.issues,
        });
      }
      throw error;
    }
  }

  private readImportedContact(
    remote: Pick<RemoteOrganization, 'phone' | 'email'>,
  ): { phone?: string; email?: string } {
    const phone = this.optionalText(remote.phone);
    const phoneForValidation = phone?.replace(/[\s().-]/g, '');
    const validPhone =
      phoneForValidation &&
      /^(?:\+?[1-9]\d{7,14}|0\d{7,14})$/.test(phoneForValidation);

    const email = this.optionalText(remote.email)?.toLowerCase();
    const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    return {
      phone: validPhone ? phone : undefined,
      email: validEmail ? email : undefined,
    };
  }

  private readImportRequest(
    input: unknown,
  ): SatusehatOrganizationImportRequest {
    const body = this.isRecord(input) ? input : {};
    const externalResourceId = this.readExternalResourceId(input);
    const code = this.optionalText(body.code);
    if (!code) {
      throw new BadRequestException({
        code: 'MASTER_DATA_CODE_REQUIRED',
        message: 'Kode lokal organisasi wajib diisi saat import',
      });
    }
    return {
      externalResourceId,
      code,
      parentId: this.optionalText(body.parentId),
    };
  }

  private readExternalResourceId(input: unknown): string {
    const body = this.isRecord(input) ? input : {};
    const externalResourceId = this.optionalText(body.externalResourceId);
    if (!externalResourceId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_EXTERNAL_ID_REQUIRED',
        message: 'ID Organization SATUSEHAT wajib diisi',
      });
    }
    return externalResourceId;
  }

  private async findExternalLink(localResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: ORGANIZATION_RESOURCE_TYPE,
          localResourceType: LOCAL_ORGANIZATION_RESOURCE_TYPE,
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
          resourceType: ORGANIZATION_RESOURCE_TYPE,
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
          resourceType: ORGANIZATION_RESOURCE_TYPE,
          localResourceType: LOCAL_ORGANIZATION_RESOURCE_TYPE,
          localResourceId,
        },
      },
      create: {
        provider: SATUSEHAT_PROVIDER,
        environment,
        resourceType: ORGANIZATION_RESOURCE_TYPE,
        localResourceType: LOCAL_ORGANIZATION_RESOURCE_TYPE,
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

  private readConfig(): { environment: string; organizationId: string } {
    const organizationId = process.env.SATUSEHAT_ORGANIZATION_ID?.trim();
    if (!organizationId) {
      throw new ServiceUnavailableException(
        'SATUSEHAT_ORGANIZATION_ID wajib diisi di environment API',
      );
    }
    return { environment: this.readEnvironment(), organizationId };
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
      return new BadGatewayException({
        code: error.code,
        message: error.message,
        httpStatus: error.httpStatus,
      });
    }
    return new BadGatewayException({
      code: 'SATUSEHAT_ORGANIZATION_IMPORT_FAILED',
      message: 'Import atau link Organization SATUSEHAT gagal',
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
