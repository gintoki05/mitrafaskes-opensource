import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
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
import { SatusehatEncounterService } from './satusehat-encounter.service';
import { SatusehatConditionService } from './satusehat-condition.service';
import { SatusehatReconciliationService } from './satusehat-reconciliation.service';
import { MemoryStore } from './memory-store';
import { IntegrationRegistry } from '../integration-registry';
import type {
  IntegrationPlugin,
  IntegrationQuery,
  IntegrationRetryOptions,
  IntegrationResourceHandler,
  IntegrationSyncContext,
} from '../integration.types';
import {
  readRetryAfterAt,
  readSatusehatFailureMetadata,
} from './satusehat-sync-log';

const PROVIDER = 'SATUSEHAT';
const DEFAULT_ENVIRONMENT = 'sandbox';

const localResourceTypes: Record<string, string> = {
  Organization: 'HealthcareOrganization',
  Location: 'Location',
  Practitioner: 'User',
  Patient: 'Patient',
  Encounter: 'Encounter',
  Condition: 'Diagnosis',
};

const resources = [
  'Organization',
  'Location',
  'Practitioner',
  'Patient',
  'Encounter',
  'Condition',
];
const operations = [
  'search',
  'import',
  'preview',
  'sync',
  'link',
  'logs',
  'reconcile',
];

interface SyncLogRecord {
  id: string;
  resourceType: string;
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  satusehatId?: string | null;
  errorMessage?: string | null;
  updatedAt: Date | string;
  payload: unknown;
}

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
    private readonly satusehatEncounters: SatusehatEncounterService,
    private readonly reconciliation: SatusehatReconciliationService,
    private readonly masterWilayah: SatusehatMasterWilayahAdapter,
    private readonly satusehatConditions?: SatusehatConditionService,
  ) {
    const handlers = new Map<string, IntegrationResourceHandler>([
      [
        'Patient',
        {
          resourceType: 'Patient',
          search: (query) => this.satusehatPatients.lookupForDraft(query),
          lookup: (query) => this.satusehatPatients.lookupForDraft(query),
          preview: (id) => this.satusehatPatients.previewPatient(id),
          sync: (id, context) =>
            context
              ? this.satusehatPatients.syncPatient(id, context)
              : this.satusehatPatients.syncPatient(id),
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
          sync: (id, context) =>
            context
              ? this.satusehatOrganizations.syncOrganization(id, context)
              : this.satusehatOrganizations.syncOrganization(id),
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
          sync: (id, context) =>
            context
              ? this.satusehatLocations.syncLocation(id, context)
              : this.satusehatLocations.syncLocation(id),
          link: (id, input) => this.satusehatLocationLink.linkExistingLocation(id, input),
        },
      ],
      [
        'Encounter',
        {
          resourceType: 'Encounter',
          preview: (id) => this.satusehatEncounters.previewEncounter(id),
          sync: (id, context) =>
            context
              ? this.satusehatEncounters.syncEncounter(id, context)
              : this.satusehatEncounters.syncEncounter(id),
        },
      ],
    ]);
    if (this.satusehatConditions) {
      handlers.set('Condition', {
        resourceType: 'Condition',
        preview: (id) => this.satusehatConditions!.previewCondition(id),
        sync: (id, context) =>
          context
            ? this.satusehatConditions!.syncCondition(id, context)
            : this.satusehatConditions!.syncCondition(id),
      });
    }
    this.handlers = handlers;
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
          .map((record) => this.toLog(record, input.includePayload)),
        meta: { page: input.page, pageSize: input.pageSize, total: records.length },
      };
    }
  }

  async retryLog(
    logId: string,
    options: IntegrationRetryOptions = { includePayload: false },
  ): Promise<unknown> {
    const log = await this.findLog(logId);
    if (!log) {
      throw new NotFoundException({
        code: 'SYNC_LOG_NOT_FOUND',
        message: 'Log sinkronisasi tidak ditemukan.',
      });
    }
    if (log.status !== 'FAILED') {
      throw new ConflictException({
        code: 'SYNC_RETRY_NOT_ALLOWED',
        message: 'Hanya log sinkronisasi gagal yang dapat di-retry.',
      });
    }

    const failure = readSatusehatFailureMetadata(log.payload);
    if (failure.retryable !== true) {
      throw new ConflictException({
        code: 'SYNC_RETRY_NOT_ALLOWED',
        message: 'Error ini tidak retryable. Jalankan tindakan operator yang ditampilkan.',
        classification: {
          category: failure.errorCategory ?? 'UNKNOWN',
          retryable: false,
          operatorAction: failure.operatorAction ?? 'INVESTIGATE',
        },
      });
    }

    const retryAfterAt = readRetryAfterAt(log.payload);
    if (retryAfterAt && retryAfterAt.getTime() > Date.now()) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((retryAfterAt.getTime() - Date.now()) / 1000),
      );
      throw new HttpException(
        {
          code: 'SATUSEHAT_SYNC_RETRY_BACKOFF',
          message: `Retry tersedia setelah ${retryAfterSeconds} detik sesuai backoff.`,
          retryAfterAt: retryAfterAt.toISOString(),
          retryAfterSeconds,
          classification: {
            category: failure.errorCategory ?? 'TRANSIENT',
            retryable: true,
            operatorAction: 'RETRY_WITH_BACKOFF',
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const handler = this.handlers.get(log.resourceType);
    if (!handler?.sync) {
      throw new NotFoundException({
        code: 'SYNC_RETRY_HANDLER_NOT_FOUND',
        message: `Resource ${log.resourceType} tidak memiliki handler sync yang dapat di-retry.`,
      });
    }

    const context: IntegrationSyncContext = {
      retryAttempt: (failure.retryAttempt ?? 0) + 1,
      retryOfLogId: log.id,
    };
    const result = await handler.sync(log.resourceId, context);
    const retryLog = await this.findLogFromResult(result);
    if (!retryLog) {
      throw new HttpException(
        {
          code: 'SYNC_RETRY_AUDIT_MISSING',
          message:
            'Retry selesai tanpa log sinkronisasi baru. Status remote tidak ditandai sukses.',
          sourceLogId: log.id,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      message: 'Retry sinkronisasi dijalankan melalui handler resource SATUSEHAT.',
      sourceLogId: log.id,
      log: this.toLog(retryLog, options.includePayload),
    };
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
        select: {
          resourceId: true,
          status: true,
          errorMessage: true,
          updatedAt: true,
          payload: true,
        },
      }),
    ]);
    const linkById = new Map(links.map((link) => [link.localResourceId, link]));
    const logById = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      if (!this.logMatchesEnvironment(log.payload, environment)) continue;
      if (!logById.has(log.resourceId)) logById.set(log.resourceId, log);
    }

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
            ? {
                status: log.status,
                errorMessage: log.errorMessage ?? undefined,
                updatedAt: log.updatedAt.toISOString(),
                ...readSatusehatFailureMetadata(log.payload),
              }
            : undefined,
        },
      ]);
    }
    return result;
  }

  reconcile() {
    return this.reconciliation.reconcile(this.readEnvironment());
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
    record: SyncLogRecord,
    includePayload: boolean,
  ): IntegrationLog {
    const failure = readSatusehatFailureMetadata(record.payload);
    const environment = this.readLogEnvironment(record.payload);
    return {
      id: record.id,
      provider: PROVIDER,
      environment,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      status: record.status,
      externalResourceId: record.satusehatId ?? undefined,
      errorMessage: record.errorMessage ?? undefined,
      updatedAt:
        record.updatedAt instanceof Date
          ? record.updatedAt.toISOString()
          : record.updatedAt,
      ...failure,
      ...(includePayload ? { payload: record.payload } : {}),
    };
  }

  private async findLog(logId: string): Promise<SyncLogRecord | undefined> {
    try {
      const record = await this.prisma.satusehatSyncLog.findUnique({
        where: { id: logId },
      });
      if (record) return record;
    } catch {
      // Fall back to the in-memory adapter used by local/test runtimes.
    }
    return MemoryStore.syncLogs.find((entry) => entry.id === logId);
  }

  private async findLogFromResult(
    result: unknown,
  ): Promise<SyncLogRecord | undefined> {
    const syncLogId = this.readSyncLogId(result);
    if (!syncLogId) return undefined;
    return this.findLog(syncLogId);
  }

  private readSyncLogId(result: unknown): string | undefined {
    if (!this.isRecord(result) || typeof result.syncLogId !== 'string') {
      return undefined;
    }
    return result.syncLogId.trim() || undefined;
  }

  private readLogEnvironment(payload: unknown): string {
    const record = this.isRecord(payload) ? payload : undefined;
    const metadata = record && this.isRecord(record.metadata) ? record.metadata : undefined;
    return typeof metadata?.environment === 'string'
      ? metadata.environment
      : this.readEnvironment();
  }

  private logMatchesEnvironment(payload: unknown, environment: string): boolean {
    return this.readLogEnvironment(payload) === environment;
  }

  private readEnvironment(): string {
    return process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_ENVIRONMENT;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
