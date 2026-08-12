import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  OrganizationSummary,
  SatusehatOrganizationMutationResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  ORGANIZATION_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-organization.constants';
import {
  parseRemoteOrganization,
  type RemoteOrganization,
} from './satusehat-organization.remote';

interface OrganizationContext {
  organization: OrganizationSummary;
  parentExternalId?: string;
  externalResourceId?: string;
  isRoot: boolean;
}

@Injectable()
export class SatusehatOrganizationLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
  ) {}

  async linkExistingOrganization(
    localResourceId: string,
    input: unknown,
  ): Promise<SatusehatOrganizationMutationResponse> {
    try {
      const externalResourceId = this.readExternalResourceId(input);
      const context = await this.getContext(localResourceId);
      const remote = parseRemoteOrganization(
        await this.fhir.getOrganization(externalResourceId),
      );
      const config = this.readConfig();

      if (
        !context.isRoot &&
        context.externalResourceId &&
        context.externalResourceId !== externalResourceId
      ) {
        throw new ConflictException({
          code: 'SATUSEHAT_LOCAL_LINK_MISMATCH',
          message:
            'Organisasi lokal sudah terhubung ke Organization SATUSEHAT lain',
        });
      }
      this.assertRemoteMatchesLocal(context, remote, config.organizationId);
      await this.ensureExternalLinkAvailable(
        localResourceId,
        externalResourceId,
        config.environment,
      );
      await this.upsertExternalLink(
        localResourceId,
        externalResourceId,
        config.environment,
      );

      return {
        operation: 'LINK_EXISTING',
        localResourceId,
        externalResourceId,
        organization: context.organization,
      };
    } catch (error) {
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
        externalResourceId: link?.externalResourceId,
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

    return {
      organization,
      parentExternalId: await this.resolveParentExternalId(
        parent,
        config.organizationId,
        config.environment,
      ),
      externalResourceId: link?.externalResourceId,
      isRoot: false,
    };
  }

  private assertRemoteMatchesLocal(
    context: OrganizationContext,
    remote: RemoteOrganization,
    rootExternalResourceId: string,
  ): void {
    if (context.isRoot) {
      if (remote.externalResourceId !== rootExternalResourceId) {
        throw new ConflictException({
          code: 'SATUSEHAT_ROOT_ID_MISMATCH',
          message:
            'Organization induk harus menggunakan SATUSEHAT_ORGANIZATION_ID',
        });
      }
      if (remote.parentExternalResourceId) {
        throw new ConflictException({
          code: 'SATUSEHAT_ROOT_HAS_PARENT',
          message:
            'Organization lokal induk tidak boleh ditautkan ke sub-organisasi',
        });
      }
      return;
    }

    if (
      !context.parentExternalId ||
      remote.parentExternalResourceId !== context.parentExternalId
    ) {
      throw new ConflictException({
        code: 'SATUSEHAT_PARENT_MISMATCH',
        message:
          'Organisasi induk lokal tidak sesuai dengan Organization.partOf SATUSEHAT',
      });
    }
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
        code: 'SATUSEHAT_ORGANIZATION_ALREADY_LINKED',
        message: 'Organization SATUSEHAT sudah terhubung ke data lokal lain',
        localResourceId: link.localResourceId,
      });
    }
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
      code: 'SATUSEHAT_ORGANIZATION_LINK_FAILED',
      message: 'Link Organization SATUSEHAT gagal',
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
