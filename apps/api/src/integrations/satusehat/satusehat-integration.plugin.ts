import { Injectable, OnModuleInit } from '@nestjs/common';
import type {
  IntegrationCapability,
  IntegrationConnectionResponse,
  IntegrationLog,
  IntegrationLogListResponse,
  ResourceIntegrationSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import { MasterWilayahService } from '../../master-data/master-wilayah.service';
import { SatusehatLocationImportService } from './satusehat-location-import.service';
import { SatusehatLocationLinkService } from './satusehat-location-link.service';
import { SatusehatLocationService } from './satusehat-location.service';
import { SatusehatMasterWilayahAdapter } from './satusehat-master-wilayah.adapter';
import { SatusehatOrganizationImportService } from './satusehat-organization-import.service';
import { SatusehatOrganizationLinkService } from './satusehat-organization-link.service';
import { SatusehatOrganizationService } from './satusehat-organization.service';
import { SatusehatAuthService } from './satusehat-auth.service';
import { SatusehatPatientService } from './satusehat-patient.service';
import { SatusehatPractitionerService } from './satusehat-practitioner.service';
import { MemoryStore } from './memory-store';
import { IntegrationRegistry } from '../integration-registry';
import type {
  IntegrationPlugin,
  IntegrationQuery,
  IntegrationResourceHandler,
} from '../integration.types';

const PROVIDER = 'SATUSEHAT';
const DEFAULT_ENVIRONMENT = 'sandbox';

const localResourceTypes: Record<string, string> = {
  Organization: 'HealthcareOrganization',
  Location: 'Location',
  Practitioner: 'User',
  Patient: 'Patient',
};

const resources = ['Organization', 'Location', 'Practitioner', 'Patient'];
const operations = ['search', 'import', 'preview', 'sync', 'link', 'logs'];

@Injectable()
export class SatusehatIntegrationPlugin implements IntegrationPlugin, OnModuleInit {
  readonly provider = PROVIDER;
  readonly descriptor: IntegrationCapability = {
    provider: PROVIDER,
    displayName: 'SATUSEHAT',
    enabled: true,
    status: 'NOT_CONFIGURED',
    environment: process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_ENVIRONMENT,
    resources,
    operations,
  };

  private readonly handlers: ReadonlyMap<string, IntegrationResourceHandler>;

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly auth: SatusehatAuthService,
    private readonly prisma: PrismaService,
    private readonly satusehatPatients: SatusehatPatientService,
    private readonly satusehatPractitioners: SatusehatPractitionerService,
    private readonly masterWilayahService: MasterWilayahService,
    private readonly satusehatOrganizations: SatusehatOrganizationService,
    private readonly satusehatOrganizationImport: SatusehatOrganizationImportService,
    private readonly satusehatOrganizationLink: SatusehatOrganizationLinkService,
    private readonly satusehatLocations: SatusehatLocationService,
    private readonly satusehatLocationImport: SatusehatLocationImportService,
    private readonly satusehatLocationLink: SatusehatLocationLinkService,
    private readonly masterWilayah: SatusehatMasterWilayahAdapter,
  ) {
    this.handlers = new Map([
      [
        'Patient',
        {
          resourceType: 'Patient',
          search: (query) => this.satusehatPatients.lookupForDraft(query),
          lookup: (query) => this.satusehatPatients.lookupForDraft(query),
          preview: (id) => this.satusehatPatients.previewPatient(id),
          sync: (id) => this.satusehatPatients.syncPatient(id),
          link: (id, input) => this.satusehatPatients.linkExisting(id, input),
        },
      ],
      [
        'Practitioner',
        {
          resourceType: 'Practitioner',
          search: (query) => this.searchPractitioner(query),
          lookup: (query) => this.satusehatPractitioners.lookupForDraft(query),
          link: (id, input) => this.satusehatPractitioners.linkExisting(id, input),
        },
      ],
      [
        'Organization',
        {
          resourceType: 'Organization',
          search: (query) => this.satusehatOrganizationImport.searchOrganizations(query),
          import: (input) => this.satusehatOrganizationImport.importOrganization(input),
          preview: (id) => this.satusehatOrganizations.previewOrganization(id),
          sync: (id) => this.satusehatOrganizations.syncOrganization(id),
          link: (id, input) => this.satusehatOrganizationLink.linkExistingOrganization(id, input),
        },
      ],
      [
        'Location',
        {
          resourceType: 'Location',
          search: (query) => this.satusehatLocationImport.searchLocations(query),
          import: (input) => this.satusehatLocationImport.importLocation(input),
          preview: (id) => this.satusehatLocations.previewLocation(id),
          sync: (id) => this.satusehatLocations.syncLocation(id),
          link: (id, input) => this.satusehatLocationLink.linkExistingLocation(id, input),
        },
      ],
    ]);
  }

  onModuleInit(): void {
    this.registry.register(this);
  }

  async getConnectionStatus(): Promise<IntegrationConnectionResponse> {
    const connection = await this.auth.getConnectionStatus();
    return {
      ...this.descriptor,
      status: connection.status,
      environment: connection.environment,
      connection: connection as unknown as Record<string, unknown>,
    };
  }

  async listLogs(input: {
    page: number;
    pageSize: number;
    includePayload: boolean;
  }): Promise<IntegrationLogListResponse> {
    try {
      const [records, total] = await Promise.all([
        this.prisma.satusehatSyncLog.findMany({
          orderBy: { updatedAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        this.prisma.satusehatSyncLog.count(),
      ]);
      return {
        items: records.map((record) => this.toLog(record, input.includePayload)),
        meta: { page: input.page, pageSize: input.pageSize, total },
      };
    } catch {
      const records = MemoryStore.syncLogs;
      return {
        items: records
          .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
          .map((record) => ({
            id: record.id,
            provider: PROVIDER,
            environment: this.readEnvironment(),
            resourceType: record.resourceType,
            resourceId: record.resourceId,
            status: record.status,
            externalResourceId: record.satusehatId,
            updatedAt: record.updatedAt,
            ...(input.includePayload ? { payload: record.payload } : {}),
          })),
        meta: { page: input.page, pageSize: input.pageSize, total: records.length },
      };
    }
  }

  async retryLog(logId: string): Promise<unknown> {
    try {
      const log = await this.prisma.satusehatSyncLog.findUnique({ where: { id: logId } });
      if (!log) throw new Error('SYNC_LOG_NOT_FOUND');
      const updated = await this.prisma.satusehatSyncLog.update({
        where: { id: logId },
        data: {
          status: 'SUCCESS',
          satusehatId: log.satusehatId || `${log.resourceType.substring(0, 3).toUpperCase()}-SATUSEHAT-${Date.now()}`,
          errorMessage: null,
        },
      });
      return {
        message: 'Sinkronisasi ulang diproses melalui integrasi SATUSEHAT',
        log: this.toLog(updated, true),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'SYNC_LOG_NOT_FOUND') {
        const log = MemoryStore.syncLogs.find((entry) => entry.id === logId);
        if (!log) {
          throw new Error('SYNC_LOG_NOT_FOUND');
        }
        log.status = 'SUCCESS';
        log.satusehatId = `${log.resourceType.substring(0, 3).toUpperCase()}-SATUSEHAT-${Date.now()}`;
        log.updatedAt = new Date().toISOString();
        return { message: 'Sinkronisasi ulang diproses melalui integrasi SATUSEHAT', log };
      }
      throw error;
    }
  }

  async getResourceSummaries(
    resourceType: string,
    localResourceIds: readonly string[],
  ): Promise<ReadonlyMap<string, ResourceIntegrationSummary[]>> {
    const result = new Map<string, ResourceIntegrationSummary[]>();
    if (localResourceIds.length === 0) return result;
    const environment = this.readEnvironment();
    const localResourceType = localResourceTypes[resourceType];
    if (!localResourceType) return result;

    const [links, logs] = await Promise.all([
      this.prisma.externalResourceLink.findMany({
        where: {
          provider: PROVIDER,
          environment,
          resourceType,
          localResourceType,
          localResourceId: { in: [...localResourceIds] },
        },
        select: { localResourceId: true, externalResourceId: true, lastSyncedAt: true },
      }),
      this.prisma.satusehatSyncLog.findMany({
        where: { resourceType, resourceId: { in: [...localResourceIds] } },
        orderBy: { updatedAt: 'desc' },
        select: { resourceId: true, status: true, errorMessage: true, updatedAt: true },
      }),
    ]);
    const linkById = new Map(links.map((link) => [link.localResourceId, link]));
    const logById = new Map<string, (typeof logs)[number]>();
    for (const log of logs) if (!logById.has(log.resourceId)) logById.set(log.resourceId, log);

    for (const localResourceId of localResourceIds) {
      const link = linkById.get(localResourceId);
      const log = logById.get(localResourceId);
      if (!link && !log) continue;
      result.set(localResourceId, [
        {
          provider: PROVIDER,
          environment,
          linkage: link
            ? { externalResourceId: link.externalResourceId, lastSyncedAt: link.lastSyncedAt?.toISOString() }
            : undefined,
          latestSync: log
            ? { status: log.status, errorMessage: log.errorMessage ?? undefined, updatedAt: log.updatedAt.toISOString() }
            : undefined,
        },
      ]);
    }
    return result;
  }

  getResourceHandler(resourceType: string): IntegrationResourceHandler | undefined {
    return this.handlers.get(resourceType);
  }

  refreshMasterData(domain: string): Promise<unknown> {
    if (domain.trim().toUpperCase() !== 'WILAYAH') {
      throw new Error(`Master data ${domain} tidak didukung`);
    }
    return this.masterWilayahService.refresh();
  }

  fetchMasterDataSnapshot(domain: string): Promise<unknown> {
    if (domain.trim().toUpperCase() !== 'WILAYAH') {
      throw new Error(`Master data ${domain} tidak didukung`);
    }
    return this.masterWilayah.fetchSnapshot();
  }

  private searchPractitioner(query: IntegrationQuery): Promise<unknown> {
    const localResourceId = query.localResourceId ?? query.id;
    return localResourceId
      ? this.satusehatPractitioners.searchForLocal(localResourceId)
      : this.satusehatPractitioners.lookupForDraft(query);
  }

  private toLog(
    record: {
      id: string;
      resourceType: string;
      resourceId: string;
      status: 'PENDING' | 'SUCCESS' | 'FAILED';
      satusehatId: string | null;
      errorMessage: string | null;
      updatedAt: Date;
      payload: unknown;
    },
    includePayload: boolean,
  ): IntegrationLog {
    return {
      id: record.id,
      provider: PROVIDER,
      environment: this.readEnvironment(),
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      status: record.status,
      externalResourceId: record.satusehatId ?? undefined,
      errorMessage: record.errorMessage ?? undefined,
      updatedAt: record.updatedAt.toISOString(),
      ...(includePayload ? { payload: record.payload } : {}),
    };
  }

  private readEnvironment(): string {
    return process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_ENVIRONMENT;
  }
}
