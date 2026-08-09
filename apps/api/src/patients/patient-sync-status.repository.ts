import type {
  SatusehatLinkageSummary,
  SatusehatSyncSummary,
} from '@mitrafaskes/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_PATIENT_RESOURCE_TYPE,
  PATIENT_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './patient.constants';

export type PatientLinkRecord = {
  localResourceId: string;
  externalResourceId: string;
  lastSyncedAt: Date | null;
};

export type PatientLogRecord = {
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  updatedAt: Date;
};

@Injectable()
export class PatientSyncStatusRepository {
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
          resourceType: PATIENT_RESOURCE_TYPE,
          externalResourceId,
        },
      },
    });
  }

  toLinkage(
    record: PatientLinkRecord | null | undefined,
  ): SatusehatLinkageSummary | undefined {
    if (!record) return undefined;
    return {
      externalResourceId: record.externalResourceId,
      lastSyncedAt: record.lastSyncedAt?.toISOString(),
    };
  }

  toSyncSummary(
    record: PatientLogRecord | null | undefined,
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
  ): Promise<Map<string, PatientLinkRecord>> {
    const result = new Map<string, PatientLinkRecord>();
    if (localResourceIds.length === 0) return result;

    const records = await this.prisma.externalResourceLink.findMany({
      where: {
        provider: SATUSEHAT_PROVIDER,
        environment: this.readEnvironment(),
        resourceType: PATIENT_RESOURCE_TYPE,
        localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
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
  ): Promise<PatientLinkRecord | null> {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment: this.readEnvironment(),
          resourceType: PATIENT_RESOURCE_TYPE,
          localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
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
  ): Promise<Map<string, PatientLogRecord>> {
    const result = new Map<string, PatientLogRecord>();
    if (localResourceIds.length === 0) return result;

    const records = await this.prisma.satusehatSyncLog.findMany({
      where: {
        resourceType: PATIENT_RESOURCE_TYPE,
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

  private findLatestLog(
    localResourceId: string,
  ): Promise<PatientLogRecord | null> {
    return this.prisma.satusehatSyncLog.findFirst({
      where: {
        resourceType: PATIENT_RESOURCE_TYPE,
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
