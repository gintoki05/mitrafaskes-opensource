import { Injectable } from '@nestjs/common';
import type {
  SatusehatLinkageSummary,
  SatusehatSyncSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import {
  ENCOUNTER_RESOURCE_TYPE,
  LOCAL_ENCOUNTER_RESOURCE_TYPE,
  readSatusehatEnvironment,
  SATUSEHAT_PROVIDER,
} from './encounter.constants';

type LinkRecord = {
  localResourceId: string;
  externalResourceId: string;
  lastSyncedAt: Date | null;
};

type LogRecord = {
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  updatedAt: Date;
};

@Injectable()
export class EncounterSyncStatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForList(localResourceIds: string[]) {
    if (localResourceIds.length === 0) {
      return {
        links: new Map<string, LinkRecord>(),
        logs: new Map<string, LogRecord>(),
      };
    }

    const environment = readSatusehatEnvironment();
    const [links, logs] = await Promise.all([
      this.prisma.externalResourceLink.findMany({
        where: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: ENCOUNTER_RESOURCE_TYPE,
          localResourceType: LOCAL_ENCOUNTER_RESOURCE_TYPE,
          localResourceId: { in: localResourceIds },
        },
        select: {
          localResourceId: true,
          externalResourceId: true,
          lastSyncedAt: true,
        },
      }),
      this.prisma.satusehatSyncLog.findMany({
        where: {
          resourceType: ENCOUNTER_RESOURCE_TYPE,
          resourceId: { in: localResourceIds },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          resourceId: true,
          status: true,
          errorMessage: true,
          updatedAt: true,
        },
      }),
    ]);

    const linkMap = new Map<string, LinkRecord>();
    links.forEach((link) => linkMap.set(link.localResourceId, link));
    const logMap = new Map<string, LogRecord>();
    logs.forEach((log) => {
      if (!logMap.has(log.resourceId)) {
        logMap.set(log.resourceId, {
          resourceId: log.resourceId,
          status: log.status,
          errorMessage: log.errorMessage,
          updatedAt: log.updatedAt,
        });
      }
    });
    return { links: linkMap, logs: logMap };
  }

  async findDependencyLink(
    resourceType: string,
    localResourceType: string,
    localResourceId: string,
  ): Promise<LinkRecord | null> {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment: readSatusehatEnvironment(),
          resourceType,
          localResourceType,
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

  toLinkage(record: LinkRecord | null | undefined): SatusehatLinkageSummary | undefined {
    if (!record) return undefined;
    return {
      externalResourceId: record.externalResourceId,
      lastSyncedAt: record.lastSyncedAt?.toISOString(),
    };
  }

  toSyncSummary(record: LogRecord | null | undefined): SatusehatSyncSummary | undefined {
    if (!record) return undefined;
    return {
      status: record.status,
      errorMessage: record.errorMessage ?? undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
