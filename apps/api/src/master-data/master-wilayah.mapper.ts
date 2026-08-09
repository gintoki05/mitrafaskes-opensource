import type { Prisma } from '@prisma/client';
import type {
  MasterDataDomain,
  MasterDataImportRunSummary,
  RegionLevel,
  RegionSummary,
} from '@mitrafaskes/shared';

export function toRegionSummary(
  record: Prisma.MasterRegionGetPayload<Prisma.MasterRegionDefaultArgs>,
): RegionSummary {
  return {
    code: record.code,
    parentCode: record.parentCode ?? undefined,
    name: record.name,
    level: record.level as RegionLevel,
    bpsCode: record.bpsCode ?? undefined,
    active: record.active,
    source: record.source,
    sourceVersion: record.sourceVersion ?? undefined,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toImportRunSummary(
  record: Prisma.MasterDataImportRunGetPayload<Prisma.MasterDataImportRunDefaultArgs>,
): MasterDataImportRunSummary {
  return {
    id: record.id,
    domain: record.domain as MasterDataDomain,
    source: record.source,
    sourceVersion: record.sourceVersion ?? undefined,
    status: record.status,
    recordsSeen: record.recordsSeen,
    recordsUpserted: record.recordsUpserted,
    recordsDeactivated: record.recordsDeactivated,
    attemptedAt: record.attemptedAt.toISOString(),
    completedAt: record.completedAt?.toISOString(),
    succeededAt: record.succeededAt?.toISOString(),
    errorCode: record.errorCode ?? undefined,
    errorMessage: record.errorMessage ?? undefined,
  };
}
