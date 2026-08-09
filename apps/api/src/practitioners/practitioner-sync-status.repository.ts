import type {
  SatusehatLinkageSummary,
  SatusehatSyncSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_PRACTITIONER_RESOURCE_TYPE,
  PRACTITIONER_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './practitioner.constants';

export type PractitionerLinkRecord = {
  localResourceId: string;
  externalResourceId: string;
  lastSyncedAt: Date | null;
};

export type PractitionerLogRecord = {
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  updatedAt: Date;
};

export class PractitionerSyncStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForList(localResourceIds: string[]) {
    const [links, logs] = await Promise.all([
      this.findLinkages(localResourceIds),
      this.findLatestLogs(localResourceIds),
    ]);
    return { links, logs };
  }

  async findForRecord(localResourceId: string) {
    const [link, log] = await Promise.all([
      this.findLinkage(localResourceId),
      this.findLatestLog(localResourceId),
    ]);
    return { link, log };
  }

  findLinkageByExternalId(externalResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        externalResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          externalResourceId,
        },
      },
    });
  }

  toLinkage(
    record: PractitionerLinkRecord | null | undefined,
  ): SatusehatLinkageSummary | undefined {
    if (!record) return undefined;
    return {
      externalResourceId: record.externalResourceId,
      lastSyncedAt: record.lastSyncedAt?.toISOString(),
    };
  }

  toSyncSummary(
    record: PractitionerLogRecord | null | undefined,
  ): SatusehatSyncSummary | undefined {
    if (!record) return undefined;
    return {
      status: record.status,
      errorMessage: record.errorMessage ?? undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async findLinkages(
    localResourceIds: string[],
  ): Promise<Map<string, PractitionerLinkRecord>> {
    const result = new Map<string, PractitionerLinkRecord>();
    if (localResourceIds.length === 0) return result;

    const records = await this.prisma.externalResourceLink.findMany({
      where: {
        provider: SATUSEHAT_PROVIDER,
        environment: this.readEnvironment(),
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
        localResourceId: { in: localResourceIds },
      },
      select: {
        localResourceId: true,
        externalResourceId: true,
        lastSyncedAt: true,
      },
    });
    for (const record of records) result.set(record.localResourceId, record);
    return result;
  }

  private async findLinkage(
    localResourceId: string,
  ): Promise<PractitionerLinkRecord | null> {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment: this.readEnvironment(),
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
          localResourceId,
        },
      },
      select: {
        localResourceId: true,
        externalResourceId: true,
        lastSyncedAt: true,
      },
    });
  }

  private async findLatestLogs(
    localResourceIds: string[],
  ): Promise<Map<string, PractitionerLogRecord>> {
    const result = new Map<string, PractitionerLogRecord>();
    if (localResourceIds.length === 0) return result;

    const records = await this.prisma.satusehatSyncLog.findMany({
      where: {
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        resourceId: { in: localResourceIds },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        resourceId: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    for (const record of records) {
      if (!result.has(record.resourceId)) {
        result.set(record.resourceId, {
          resourceId: record.resourceId,
          status: record.status,
          errorMessage: record.errorMessage,
          updatedAt: record.updatedAt,
        });
      }
    }
    return result;
  }

  private async findLatestLog(
    localResourceId: string,
  ): Promise<PractitionerLogRecord | null> {
    return this.prisma.satusehatSyncLog.findFirst({
      where: {
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        resourceId: localResourceId,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        resourceId: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }
}
