import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MasterDataImportStatus, Prisma } from '@prisma/client';
import type {
  MasterDataDatasetStatus,
  MasterDataRegionsResponse,
  MasterDataRefreshResponse,
  RegionDetail,
  RegionLevel,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { MASTER_WILAYAH_PROVIDER } from './master-wilayah.provider';
import type { MasterWilayahProvider } from './master-wilayah.provider';
import {
  MasterRegionValidationError,
  parseRegionLevel,
  validateMasterWilayahSnapshot,
} from './master-wilayah.validation';
import { MasterDataDatasetStatusService } from './master-data-dataset-status.service';
import { toImportRunSummary, toRegionSummary } from './master-wilayah.mapper';
import { toMasterWilayahRefreshFailure } from './master-wilayah.errors';
import { Inject } from '@nestjs/common';

const WILAYAH_DOMAIN = 'WILAYAH' as const;
const MASTER_REGION_IMPORT_BATCH_SIZE = 2_000;
const MASTER_REGION_TRANSACTION_TIMEOUT_MS = 120_000;

export interface MasterWilayahListQuery {
  level: RegionLevel;
  parentCode?: string;
  search?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class MasterWilayahService {
  private refreshInFlight?: Promise<MasterDataRefreshResponse>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly datasetStatuses: MasterDataDatasetStatusService,
    @Inject(MASTER_WILAYAH_PROVIDER)
    private readonly provider: MasterWilayahProvider,
  ) {}

  listDatasets(includeError: boolean): Promise<MasterDataDatasetStatus[]> {
    return this.datasetStatuses.listDatasets(includeError);
  }

  async listRegions(
    query: MasterWilayahListQuery,
  ): Promise<MasterDataRegionsResponse> {
    const where: Prisma.MasterRegionWhereInput = {
      level: query.level,
      active: true,
      ...(query.parentCode ? { parentCode: query.parentCode } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.masterRegion.findMany({
        where,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.masterRegion.count({ where }),
    ]);

    return {
      items: records.map(toRegionSummary),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async getRegion(levelInput: string, code: string): Promise<RegionDetail> {
    const level = parseRegionLevel(levelInput);
    const normalizedCode = code.trim();
    const item = await this.prisma.masterRegion.findUnique({
      where: {
        level_code: {
          level,
          code: normalizedCode,
        },
      },
    });

    if (!item || !item.active) {
      throw new NotFoundException('Wilayah tidak ditemukan');
    }

    const children = await this.prisma.masterRegion.findMany({
      where: { parentCode: item.code, active: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });

    return {
      item: toRegionSummary(item),
      children: children.map(toRegionSummary),
    };
  }

  async refresh(): Promise<MasterDataRefreshResponse> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const refresh = this.executeRefresh();
    this.refreshInFlight = refresh;
    try {
      return await refresh;
    } finally {
      if (this.refreshInFlight === refresh) this.refreshInFlight = undefined;
    }
  }

  private async executeRefresh(): Promise<MasterDataRefreshResponse> {
    const run = await this.prisma.masterDataImportRun.create({
      data: {
        domain: WILAYAH_DOMAIN,
        source: 'REMOTE_PROVIDER',
        status: MasterDataImportStatus.PENDING,
        attemptedAt: new Date(),
      },
    });

    try {
      const snapshot = await this.provider.fetchSnapshot();
      if (!snapshot.complete) {
        throw new MasterRegionValidationError(
          'Provider Master Wilayah belum mengirim snapshot lengkap',
        );
      }

      const records = validateMasterWilayahSnapshot(snapshot.records);
      const importedRun = await this.prisma.$transaction(
        async (tx) => {
          const activeRecords = await tx.masterRegion.findMany({
            where: { active: true },
            select: { id: true, level: true, code: true },
          });
          const incomingKeys = new Set(
            records.map((record) => `${record.level}:${record.code}`),
          );
          const staleIds = activeRecords
            .filter(
              (record) => !incomingKeys.has(`${record.level}:${record.code}`),
            )
            .map((record) => record.id);

          let recordsDeactivated = 0;
          for (const idBatch of this.chunk(
            staleIds,
            MASTER_REGION_IMPORT_BATCH_SIZE,
          )) {
            const result = await tx.masterRegion.updateMany({
              where: { id: { in: idBatch } },
              data: { active: false },
            });
            recordsDeactivated += result.count;
          }

          let recordsUpserted = 0;
          const importedAt = new Date();
          for (const recordBatch of this.chunk(
            records,
            MASTER_REGION_IMPORT_BATCH_SIZE,
          )) {
            const values = recordBatch.map(
              (record) => Prisma.sql`(
              ${randomUUID()},
              CAST(${record.level} AS "MasterRegionLevel"),
              ${record.code},
              ${record.parentCode ?? null},
              ${record.bpsCode ?? null},
              ${record.name},
              true,
              ${snapshot.source},
              ${snapshot.sourceVersion},
              ${importedAt},
              ${importedAt}
            )`,
            );
            recordsUpserted += await tx.$executeRaw(Prisma.sql`
            INSERT INTO "MasterRegion" (
              "id", "level", "code", "parentCode", "bpsCode", "name",
              "active", "source", "sourceVersion", "createdAt", "updatedAt"
            )
            VALUES ${Prisma.join(values, ', ')}
            ON CONFLICT ("level", "code") DO UPDATE SET
              "parentCode" = EXCLUDED."parentCode",
              "bpsCode" = EXCLUDED."bpsCode",
              "name" = EXCLUDED."name",
              "active" = EXCLUDED."active",
              "source" = EXCLUDED."source",
              "sourceVersion" = EXCLUDED."sourceVersion",
              "updatedAt" = EXCLUDED."updatedAt"
          `);
          }

          return tx.masterDataImportRun.update({
            where: { id: run.id },
            data: {
              source: snapshot.source,
              sourceVersion: snapshot.sourceVersion,
              status: MasterDataImportStatus.SUCCESS,
              recordsSeen: records.length,
              recordsUpserted,
              recordsDeactivated,
              completedAt: new Date(),
              succeededAt: new Date(),
              errorCode: null,
              errorMessage: null,
            },
          });
        },
        {
          maxWait: 10_000,
          timeout: MASTER_REGION_TRANSACTION_TIMEOUT_MS,
        },
      );

      return {
        dataset: await this.datasetStatuses.getDatasetStatus(
          WILAYAH_DOMAIN,
          'Master Wilayah',
          true,
        ),
        importRun: toImportRunSummary(importedRun),
      };
    } catch (error) {
      const failure = toMasterWilayahRefreshFailure(error);
      const failedRun = await this.prisma.masterDataImportRun.update({
        where: { id: run.id },
        data: {
          status: MasterDataImportStatus.FAILED,
          completedAt: new Date(),
          errorCode: failure.code,
          errorMessage: failure.message,
        },
      });
      const dataset = await this.datasetStatuses.getDatasetStatus(
        WILAYAH_DOMAIN,
        'Master Wilayah',
        true,
      );

      throw new HttpException(
        {
          code: failure.code,
          message: failure.message,
          importRun: toImportRunSummary(failedRun),
          dataset,
        },
        failure.httpStatus,
      );
    }
  }

  private chunk<T>(values: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks;
  }
}
