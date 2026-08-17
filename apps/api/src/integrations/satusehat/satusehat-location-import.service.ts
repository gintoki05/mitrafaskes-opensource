import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  SatusehatLocationImportRequest,
  SatusehatLocationMutationResponse,
  SatusehatLocationSearchQuery,
  SatusehatLocationSearchResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import { MasterDataService } from '../../master-data/master-data.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_LOCATION_RESOURCE_TYPE,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  LOCATION_RESOURCE_TYPE,
  ORGANIZATION_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-location.constants';
import {
  parseRemoteLocation,
  parseSearchResponse,
  type RemoteLocation,
  toRemoteSummary,
} from './satusehat-location.remote';

@Injectable()
export class SatusehatLocationImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fhir: SatusehatFhirClient,
    private readonly masterData: MasterDataService,
  ) {}

  async searchLocations(
    input: SatusehatLocationSearchQuery = {},
  ): Promise<SatusehatLocationSearchResponse> {
    const id = this.optionalText(input.id);
    const identifier = this.optionalText(input.identifier);
    const name = this.optionalText(input.name);
    const organization = this.optionalText(input.organization);
    const organizationLocalId = this.optionalText(input.organizationLocalId);

    if (!id && !identifier && !name && !organization && !organizationLocalId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_LOCATION_SEARCH_TERM_REQUIRED',
        message: 'Isi ID, kode, nama, atau organisasi untuk mencari Location',
      });
    }

    try {
      const environment = this.readEnvironment();
      const resolvedOrganization = organizationLocalId
        ? await this.resolveOrganizationExternalId(
            organizationLocalId,
            environment,
          )
        : organization;
      const response = id
        ? await this.fhir.getLocation(id)
        : await this.fhir.searchLocations({
            identifier: this.normalizeIdentifier(
              identifier,
              resolvedOrganization,
            ),
            name,
            organization: resolvedOrganization,
          });
      const records = id
        ? [parseRemoteLocation(response)]
        : parseSearchResponse(response);
      const scopedRecords = resolvedOrganization
        ? records.filter(
            (record) =>
              !record.managingOrganizationExternalResourceId ||
              record.managingOrganizationExternalResourceId ===
                resolvedOrganization,
          )
        : records;
      const items = await Promise.all(
        scopedRecords.map(async (record) => {
          const link = await this.findExternalLinkByExternalId(
            LOCATION_RESOURCE_TYPE,
            record.externalResourceId,
            environment,
          );
          const parentLink = record.parentExternalResourceId
            ? await this.findExternalLinkByExternalId(
                LOCATION_RESOURCE_TYPE,
                record.parentExternalResourceId,
                environment,
              )
            : undefined;
          return toRemoteSummary(record, {
            linkedLocalResourceId: link?.localResourceId,
            parentLinkedLocalResourceId:
              parentLink?.localResourceType === LOCAL_LOCATION_RESOURCE_TYPE
                ? parentLink.localResourceId
                : undefined,
          });
        }),
      );

      return { items, total: items.length };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async importLocation(
    input: unknown,
  ): Promise<SatusehatLocationMutationResponse> {
    try {
      const request = this.readImportRequest(input);
      const environment = this.readEnvironment();
      const remote = await this.getRemoteLocation(request.externalResourceId);
      const existingLink = await this.findExternalLinkByExternalId(
        LOCATION_RESOURCE_TYPE,
        remote.externalResourceId,
        environment,
      );
      if (existingLink) {
        throw new ConflictException({
          code: 'SATUSEHAT_LOCATION_ALREADY_LINKED',
          message: 'Location SATUSEHAT sudah terhubung ke data lokal',
          localResourceId: existingLink.localResourceId,
        });
      }

      const organizationId = await this.resolveLocalOrganizationId(
        remote,
        request.organizationId,
        environment,
      );
      const parentId = await this.resolveLocalParentId(
        remote,
        request.parentId,
        organizationId,
        environment,
      );
      const location = await this.masterData.createLocation({
        organizationId,
        parentId,
        code: this.toLocalCode(remote, request.code),
        name: remote.name,
        type: this.toLocalType(remote.physicalTypeCode),
        description: remote.description,
        status: remote.status.toUpperCase(),
        mode: remote.mode.toUpperCase(),
        physicalTypeCode: remote.physicalTypeCode?.toUpperCase(),
        addressText: remote.addressText,
        city: remote.city,
        postalCode: remote.postalCode,
        countryCode: remote.countryCode ?? 'ID',
        latitude: remote.latitude,
        longitude: remote.longitude,
        altitude: remote.altitude,
        active: remote.status !== 'inactive',
      });

      await this.upsertExternalLink(
        location.id,
        remote.externalResourceId,
        environment,
      );

      return {
        operation: 'IMPORT',
        localResourceId: location.id,
        externalResourceId: remote.externalResourceId,
        location,
      };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private async getRemoteLocation(
    externalResourceId: string,
  ): Promise<RemoteLocation> {
    return parseRemoteLocation(await this.fhir.getLocation(externalResourceId));
  }

  private async resolveOrganizationExternalId(
    localResourceId: string,
    environment: string,
  ): Promise<string> {
    const organization = await this.prisma.healthcareOrganization.findUnique({
      where: { id: localResourceId },
    });
    if (!organization) {
      throw new NotFoundException('Organisasi lokal tidak ditemukan');
    }
    const link = await this.findExternalLink(
      ORGANIZATION_RESOURCE_TYPE,
      LOCAL_ORGANIZATION_RESOURCE_TYPE,
      localResourceId,
      environment,
    );
    if (!link) {
      throw new ConflictException({
        code: 'SATUSEHAT_ORGANIZATION_NOT_SYNCED',
        message:
          'Organisasi harus disinkronkan ke SATUSEHAT sebelum pencarian Location',
      });
    }
    return link.externalResourceId;
  }

  private async resolveLocalOrganizationId(
    remote: RemoteLocation,
    requestedLocalId: string | undefined,
    environment: string,
  ): Promise<string> {
    const remoteOrganizationId = remote.managingOrganizationExternalResourceId;
    if (!remoteOrganizationId) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_MANAGING_ORGANIZATION_MISSING',
        message:
          'Location SATUSEHAT tidak memiliki managingOrganization yang dapat dipetakan',
      });
    }

    if (requestedLocalId) {
      const organization = await this.prisma.healthcareOrganization.findUnique({
        where: { id: requestedLocalId },
      });
      if (!organization) {
        throw new NotFoundException('Organisasi lokal tidak ditemukan');
      }
      const link = await this.findExternalLink(
        ORGANIZATION_RESOURCE_TYPE,
        LOCAL_ORGANIZATION_RESOURCE_TYPE,
        requestedLocalId,
        environment,
      );
      if (!link) {
        throw new ConflictException({
          code: 'SATUSEHAT_ORGANIZATION_NOT_SYNCED',
          message:
            'Organisasi harus disinkronkan ke SATUSEHAT sebelum Location diimpor',
        });
      }
      if (link.externalResourceId !== remoteOrganizationId) {
        throw new ConflictException({
          code: 'SATUSEHAT_LOCATION_ORGANIZATION_MISMATCH',
          message:
            'Organisasi lokal tidak sesuai dengan Location.managingOrganization SATUSEHAT',
        });
      }
      return requestedLocalId;
    }

    const link = await this.findExternalLinkByExternalId(
      ORGANIZATION_RESOURCE_TYPE,
      remoteOrganizationId,
      environment,
    );
    if (!link || link.localResourceType !== LOCAL_ORGANIZATION_RESOURCE_TYPE) {
      throw new ConflictException({
        code: 'SATUSEHAT_ORGANIZATION_NOT_LINKED',
        message: 'Managing Organization Location belum terhubung ke data lokal',
      });
    }
    return link.localResourceId;
  }

  private async resolveLocalParentId(
    remote: RemoteLocation,
    requestedLocalId: string | undefined,
    organizationId: string,
    environment: string,
  ): Promise<string | undefined> {
    if (!remote.parentExternalResourceId) {
      if (requestedLocalId) {
        throw new ConflictException({
          code: 'SATUSEHAT_LOCATION_PARENT_MISMATCH',
          message: 'Location SATUSEHAT tidak memiliki parent Location',
        });
      }
      return undefined;
    }

    const parentId = requestedLocalId
      ? requestedLocalId
      : (
          await this.findExternalLinkByExternalId(
            LOCATION_RESOURCE_TYPE,
            remote.parentExternalResourceId,
            environment,
          )
        )?.localResourceId;
    if (!parentId) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_PARENT_NOT_LINKED',
        message:
          'Parent Location harus diimpor atau dihubungkan terlebih dahulu',
      });
    }

    const parent = await this.prisma.location.findUnique({
      where: { id: parentId },
    });
    if (!parent)
      throw new NotFoundException('Parent Location lokal tidak ditemukan');
    if (parent.organizationId !== organizationId) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_PARENT_ORGANIZATION_MISMATCH',
        message: 'Parent Location harus berada di organisasi yang sama',
      });
    }

    const parentLink = await this.findExternalLink(
      LOCATION_RESOURCE_TYPE,
      LOCAL_LOCATION_RESOURCE_TYPE,
      parentId,
      environment,
    );
    if (
      !parentLink ||
      parentLink.externalResourceId !== remote.parentExternalResourceId
    ) {
      throw new ConflictException({
        code: 'SATUSEHAT_LOCATION_PARENT_MISMATCH',
        message:
          'Parent Location lokal tidak sesuai dengan Location.partOf SATUSEHAT',
      });
    }
    return parentId;
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
    resourceType: string,
    externalResourceId: string,
    environment: string,
  ) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        externalResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType,
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

  private normalizeIdentifier(
    identifier: string | undefined,
    organizationExternalId: string | undefined,
  ): string | undefined {
    if (!identifier || identifier.includes('|') || !organizationExternalId) {
      return identifier;
    }
    return `http://sys-ids.kemkes.go.id/location/${organizationExternalId}|${identifier}`;
  }

  private toLocalCode(remote: RemoteLocation, requestedCode?: string): string {
    const raw =
      this.optionalText(requestedCode) ?? remote.identifierValue ?? remote.name;
    const normalized = raw
      .toUpperCase()
      .replace(/[^A-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return (
      normalized ||
      `LOCATION-${remote.externalResourceId.slice(0, 8).toUpperCase()}`
    );
  }

  private toLocalType(
    physicalTypeCode: string | undefined,
  ): 'BUILDING' | 'FLOOR' | 'ROOM' | 'OTHER' {
    switch (physicalTypeCode?.toLowerCase()) {
      case 'bu':
        return 'BUILDING';
      case 'lvl':
        return 'FLOOR';
      case 'ro':
        return 'ROOM';
      default:
        return 'OTHER';
    }
  }

  private readImportRequest(input: unknown): SatusehatLocationImportRequest {
    const body = this.isRecord(input) ? input : {};
    const externalResourceId = this.optionalText(body.externalResourceId);
    if (!externalResourceId) {
      throw new BadRequestException({
        code: 'SATUSEHAT_EXTERNAL_ID_REQUIRED',
        message: 'ID Location SATUSEHAT wajib diisi',
      });
    }
    return {
      externalResourceId,
      organizationId: this.optionalText(body.organizationId),
      parentId: this.optionalText(body.parentId),
      code: this.optionalText(body.code),
    };
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
      code: 'SATUSEHAT_LOCATION_IMPORT_FAILED',
      message: 'Search atau import Location SATUSEHAT gagal',
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
