import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  OrganizationSummary,
  SatusehatOrganizationPayload,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import { SatusehatOrganizationTransformer } from './organization-transformer';

const PROVIDER = 'SATUSEHAT';
const RESOURCE_TYPE = 'Organization';
const LOCAL_RESOURCE_TYPE = 'HealthcareOrganization';
const DEFAULT_ENVIRONMENT = 'sandbox';
const LINK_CONFLICT_MESSAGE =
  'Organization induk SATUSEHAT sudah terhubung ke fasilitas lokal lain. Gunakan fasilitas yang sudah terhubung atau ubah Organization ini menjadi SUB_ORGANIZATION.';

type OrganizationSyncOperation = 'LINK_EXISTING_ROOT' | 'CREATE' | 'UPDATE';

export interface SatusehatOrganizationPreview {
  localResourceId: string;
  operation: OrganizationSyncOperation;
  externalResourceId?: string;
  payload: SatusehatOrganizationPayload;
}

export interface SatusehatOrganizationSyncResult extends SatusehatOrganizationPreview {
  syncedRemotely: boolean;
  syncLogId?: string;
  response?: unknown;
}

interface OrganizationContext {
  organization: OrganizationSummary;
  parentExternalId?: string;
  parentDisplay?: string;
  externalResourceId?: string;
  isRoot: boolean;
}

@Injectable()
export class SatusehatOrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
  ) {}

  async previewOrganization(
    localResourceId: string,
  ): Promise<SatusehatOrganizationPreview> {
    const context = await this.getContext(localResourceId);
    const config = this.readConfig();
    const payload = SatusehatOrganizationTransformer.transform({
      organization: context.organization,
      rootOrganizationId: config.organizationId,
      parentExternalId: context.parentExternalId,
      parentDisplay: context.parentDisplay,
      externalId: context.externalResourceId,
    });

    return {
      localResourceId,
      operation: context.isRoot
        ? 'LINK_EXISTING_ROOT'
        : context.externalResourceId
          ? 'UPDATE'
          : 'CREATE',
      externalResourceId: context.externalResourceId,
      payload,
    };
  }

  async syncOrganization(
    localResourceId: string,
  ): Promise<SatusehatOrganizationSyncResult> {
    const preview = await this.previewOrganization(localResourceId);

    if (preview.operation === 'LINK_EXISTING_ROOT') {
      const config = this.readConfig();
      const syncLog = await this.prisma.satusehatSyncLog.create({
        data: {
          resourceType: RESOURCE_TYPE,
          resourceId: localResourceId,
          status: 'PENDING',
          payload: preview.payload as unknown as Prisma.InputJsonValue,
        },
      });

      try {
        const response = await this.fhir.getOrganization(config.organizationId);
        const remoteId = this.extractResourceId(response);
        if (!remoteId) {
          throw new BadGatewayException({
            code: 'SATUSEHAT_ORGANIZATION_ID_MISSING',
            message: 'Response Organization induk SATUSEHAT tidak memiliki id',
          });
        }
        if (remoteId !== config.organizationId) {
          throw new BadGatewayException({
            code: 'SATUSEHAT_ORGANIZATION_ID_MISMATCH',
            message:
              'ID Organization induk dari SATUSEHAT tidak sesuai konfigurasi',
          });
        }

        await this.ensureRootLink(localResourceId, config.organizationId);
        await this.prisma.satusehatSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'SUCCESS',
            satusehatId: config.organizationId,
            payload: preview.payload as unknown as Prisma.InputJsonValue,
            errorMessage: null,
          },
        });
        return {
          ...preview,
          externalResourceId: config.organizationId,
          syncedRemotely: true,
          syncLogId: syncLog.id,
          response,
        };
      } catch (error) {
        await this.markSyncFailed(syncLog.id, error);
        throw this.toHttpError(error);
      }
    }

    const syncLog = await this.prisma.satusehatSyncLog.create({
      data: {
        resourceType: RESOURCE_TYPE,
        resourceId: localResourceId,
        status: 'PENDING',
        payload: preview.payload as unknown as Prisma.InputJsonValue,
      },
    });

    try {
      const response =
        preview.operation === 'UPDATE'
          ? await this.fhir.updateOrganization(
              preview.externalResourceId!,
              preview.payload,
            )
          : await this.fhir.createOrganization(preview.payload);
      const externalResourceId =
        this.extractResourceId(response) || preview.externalResourceId;
      if (!externalResourceId) {
        throw new BadGatewayException({
          code: 'SATUSEHAT_ORGANIZATION_ID_MISSING',
          message: 'Response Organization SATUSEHAT tidak memiliki id',
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
      await this.markSyncFailed(syncLog.id, error);
      throw this.toHttpError(error);
    }
  }

  private async getContext(
    localResourceId: string,
  ): Promise<OrganizationContext> {
    const record = await this.prisma.healthcareOrganization.findUnique({
      where: { id: localResourceId },
      include: { parent: true },
    });
    if (!record) throw new NotFoundException('Organisasi tidak ditemukan');

    const config = this.readConfig();
    const link = await this.findExternalLink(
      localResourceId,
      config.environment,
    );
    const organization = this.toOrganizationSummary(record);
    const isRoot =
      record.type === 'HEALTHCARE_FACILITY' && record.parentId === null;

    if (isRoot) {
      if (link && link.externalResourceId !== config.organizationId) {
        throw new ConflictException({
          code: 'SATUSEHAT_ROOT_LINK_MISMATCH',
          message:
            'Link Organization induk lokal berbeda dengan SATUSEHAT_ORGANIZATION_ID',
        });
      }
      return {
        organization,
        externalResourceId: config.organizationId,
        isRoot: true,
      };
    }

    if (record.type === 'HEALTHCARE_FACILITY' && record.parentId) {
      throw new ConflictException({
        code: 'HEALTHCARE_FACILITY_PARENT_NOT_ALLOWED',
        message:
          'Organisasi bertipe HEALTHCARE_FACILITY harus menjadi organisasi induk tanpa parent',
      });
    }
    if (!record.parentId) {
      throw new ConflictException({
        code: 'SUB_ORGANIZATION_PARENT_REQUIRED',
        message: 'SUB_ORGANIZATION wajib memiliki organisasi induk',
      });
    }

    const parent = await this.prisma.healthcareOrganization.findUnique({
      where: { id: record.parentId },
    });
    if (!parent)
      throw new NotFoundException('Organisasi induk tidak ditemukan');

    const parentExternalId = await this.resolveParentExternalId(
      parent,
      config.organizationId,
      config.environment,
    );
    return {
      organization,
      parentExternalId,
      parentDisplay: parent.name,
      externalResourceId: link?.externalResourceId,
      isRoot: false,
    };
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

  private async findExternalLink(localResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: PROVIDER,
          environment,
          resourceType: RESOURCE_TYPE,
          localResourceType: LOCAL_RESOURCE_TYPE,
          localResourceId,
        },
      },
    });
  }

  private async ensureRootLink(
    localResourceId: string,
    externalResourceId: string,
  ): Promise<void> {
    const config = this.readConfig();
    await this.upsertExternalLink(
      localResourceId,
      externalResourceId,
      config.environment,
    );
  }

  private async upsertExternalLink(
    localResourceId: string,
    externalResourceId: string,
    environment: string,
  ): Promise<void> {
    await this.prisma.externalResourceLink.upsert({
      where: {
        localResourceScope: {
          provider: PROVIDER,
          environment,
          resourceType: RESOURCE_TYPE,
          localResourceType: LOCAL_RESOURCE_TYPE,
          localResourceId,
        },
      },
      create: {
        provider: PROVIDER,
        environment,
        resourceType: RESOURCE_TYPE,
        localResourceType: LOCAL_RESOURCE_TYPE,
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
  ): Promise<void> {
    await this.prisma.satusehatSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'FAILED',
        errorMessage: this.safeErrorMessage(error),
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
    return {
      environment:
        process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_ENVIRONMENT,
      organizationId,
    };
  }

  private toOrganizationSummary(record: {
    id: string;
    code: string;
    name: string;
    type: OrganizationSummary['type'];
    parentId: string | null;
    addressText: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationSummary {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      type: record.type,
      parentId: record.parentId ?? undefined,
      addressText: record.addressText ?? undefined,
      phone: record.phone ?? undefined,
      email: record.email ?? undefined,
      integrations: [],
      active: record.active,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
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
    if (this.isLinkConflict(error)) {
      return new ConflictException({
        code: 'SATUSEHAT_ORGANIZATION_LINK_CONFLICT',
        message: LINK_CONFLICT_MESSAGE,
      });
    }
    if (error instanceof SatusehatFhirError) {
      return new BadGatewayException(error.toContract());
    }
    return new BadGatewayException({
      code: 'SATUSEHAT_ORGANIZATION_SYNC_FAILED',
      message: 'Sinkronisasi Organization ke SATUSEHAT gagal',
    });
  }

  private safeErrorMessage(error: unknown): string {
    if (this.isLinkConflict(error)) return LINK_CONFLICT_MESSAGE;
    if (error instanceof SatusehatFhirError) return error.message;
    if (error instanceof Error) return error.message;
    return 'Sinkronisasi Organization ke SATUSEHAT gagal';
  }

  private isLinkConflict(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
