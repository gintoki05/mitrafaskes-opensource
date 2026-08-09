import { Injectable } from '@nestjs/common';
import { MasterDataImportStatus } from '@prisma/client';
import type {
  MasterDataDatasetStatus,
  MasterDataDomain,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { toSafeMasterWilayahErrorMessage } from './master-wilayah.errors';

const DATASET_CATALOG: ReadonlyArray<{
  domain: MasterDataDomain;
  label: string;
}> = [
  { domain: 'WILAYAH', label: 'Master Wilayah' },
  { domain: 'MPI', label: 'Master Patient Index (MPI)' },
  { domain: 'MSI', label: 'Master Sarana Index (MSI)' },
  { domain: 'MARITAL_STATUS', label: 'Status Perkawinan' },
  { domain: 'ICD10', label: 'ICD-10' },
  { domain: 'KFA', label: 'Kamus Farmasi dan Alat Kesehatan (KFA)' },
];

@Injectable()
export class MasterDataDatasetStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async listDatasets(
    includeError: boolean,
  ): Promise<MasterDataDatasetStatus[]> {
    return Promise.all(
      DATASET_CATALOG.map((dataset) =>
        this.getDatasetStatus(dataset.domain, dataset.label, includeError),
      ),
    );
  }

  async getDatasetStatus(
    domain: MasterDataDomain,
    label: string,
    includeError: boolean,
  ): Promise<MasterDataDatasetStatus> {
    const [activeRecordCount, latestAttempt, latestSuccessful] =
      await Promise.all([
        domain === 'WILAYAH'
          ? this.prisma.masterRegion.count({ where: { active: true } })
          : domain === 'MARITAL_STATUS'
            ? this.prisma.masterMaritalStatus.count({ where: { active: true } })
            : domain === 'ICD10'
              ? this.prisma.masterIcd10.count({ where: { active: true } })
            : Promise.resolve(0),
        this.prisma.masterDataImportRun.findFirst({
          where: { domain },
          orderBy: [{ attemptedAt: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.masterDataImportRun.findFirst({
          where: { domain, status: MasterDataImportStatus.SUCCESS },
          orderBy: [{ succeededAt: 'desc' }, { attemptedAt: 'desc' }],
        }),
      ]);

    const readiness =
      latestAttempt?.status === MasterDataImportStatus.FAILED
        ? 'FAILED'
        : activeRecordCount > 0
          ? 'READY'
          : 'EMPTY';

    return {
      domain,
      label,
      readiness,
      activeRecordCount,
      source: latestSuccessful?.source,
      sourceVersion: latestSuccessful?.sourceVersion ?? undefined,
      lastAttemptAt: latestAttempt?.attemptedAt.toISOString(),
      lastSuccessfulAt: latestSuccessful?.succeededAt?.toISOString(),
      ...(includeError &&
      latestAttempt?.status === MasterDataImportStatus.FAILED
        ? {
            lastError: {
              code: latestAttempt.errorCode || 'MASTER_DATA_REFRESH_FAILED',
              message:
                domain === 'WILAYAH'
                  ? toSafeMasterWilayahErrorMessage(
                      latestAttempt.errorMessage ||
                        'Refresh Master Data gagal; data lokal terakhir tetap digunakan',
                      latestAttempt.errorCode || undefined,
                    )
                  : latestAttempt.errorMessage ||
                    'Refresh Master Data gagal; data lokal terakhir tetap digunakan',
            },
          }
        : {}),
    };
  }
}
