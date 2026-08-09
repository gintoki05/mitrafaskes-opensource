import { MasterDataImportStatus } from '@prisma/client';
import { MasterWilayahService } from './master-wilayah.service';

const run = {
  id: 'run-1',
  domain: 'WILAYAH',
  source: 'SATUSEHAT',
  sourceVersion: null,
  status: MasterDataImportStatus.PENDING,
  recordsSeen: 0,
  recordsUpserted: 0,
  recordsDeactivated: 0,
  attemptedAt: new Date('2026-08-09T00:00:00.000Z'),
  completedAt: null,
  succeededAt: null,
  errorCode: null,
  errorMessage: null,
  createdAt: new Date('2026-08-09T00:00:00.000Z'),
  updatedAt: new Date('2026-08-09T00:00:00.000Z'),
};

describe('MasterWilayahService refresh pipeline', () => {
  it('records failed imports without entering the transaction', async () => {
    const prisma = createPrismaMock();
    prisma.masterDataImportRun.create.mockResolvedValue(run);
    prisma.masterDataImportRun.update.mockResolvedValue({
      ...run,
      status: MasterDataImportStatus.FAILED,
      completedAt: new Date('2026-08-09T00:00:01.000Z'),
      errorCode: 'MASTER_DATA_VALIDATION_FAILED',
      errorMessage: 'Parent 11 untuk wilayah 1103 tidak ditemukan',
    });
    prisma.masterDataImportRun.findFirst.mockResolvedValue(null);
    prisma.masterRegion.count.mockResolvedValue(2);

    const provider = {
      fetchSnapshot: jest.fn().mockResolvedValue({
        source: 'SATUSEHAT',
        sourceVersion: 'v1',
        complete: true,
        records: [
          { level: 'REGENCY', code: '1103', parentCode: '11', name: 'Aceh Timur' },
        ],
      }),
    };
    const datasetStatuses = {
      getDatasetStatus: jest.fn().mockResolvedValue({
        domain: 'WILAYAH',
        label: 'Master Wilayah',
        readiness: 'FAILED',
        activeRecordCount: 2,
      }),
    };
    const service = new MasterWilayahService(
      prisma as never,
      datasetStatuses as never,
      provider,
    );

    await expect(service.refresh()).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MASTER_DATA_VALIDATION_FAILED',
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.masterDataImportRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MasterDataImportStatus.FAILED,
        }),
      }),
    );
  });

  it('deactivates stale records and commits a valid snapshot atomically', async () => {
    const prisma = createPrismaMock();
    const successRun = {
      ...run,
      status: MasterDataImportStatus.SUCCESS,
      sourceVersion: 'v1',
      recordsSeen: 1,
      recordsUpserted: 1,
      recordsDeactivated: 1,
      completedAt: new Date('2026-08-09T00:00:01.000Z'),
      succeededAt: new Date('2026-08-09T00:00:01.000Z'),
    };
    prisma.masterDataImportRun.create.mockResolvedValue(run);
    prisma.masterDataImportRun.findFirst
      .mockResolvedValueOnce(successRun)
      .mockResolvedValueOnce(successRun);
    prisma.masterRegion.count.mockResolvedValue(1);
    const tx = {
      masterRegion: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'stale-1', level: 'PROVINCE', code: '12' },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      masterDataImportRun: {
        update: jest.fn().mockResolvedValue(successRun),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const provider = {
      fetchSnapshot: jest.fn().mockResolvedValue({
        source: 'SATUSEHAT',
        sourceVersion: 'v1',
        complete: true,
        records: [
          { level: 'PROVINCE', code: '11', name: 'Aceh' },
        ],
      }),
    };
    const datasetStatuses = {
      getDatasetStatus: jest.fn().mockResolvedValue({
        domain: 'WILAYAH',
        label: 'Master Wilayah',
        readiness: 'READY',
        activeRecordCount: 1,
        source: 'SATUSEHAT',
        sourceVersion: 'v1',
      }),
    };
    const service = new MasterWilayahService(
      prisma as never,
      datasetStatuses as never,
      provider,
    );

    await expect(service.refresh()).resolves.toMatchObject({
      importRun: expect.objectContaining({
        status: 'SUCCESS',
        recordsDeactivated: 1,
      }),
    });
    expect(tx.masterRegion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['stale-1'] } },
      data: { active: false },
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 120_000 }),
    );
  });
});

function createPrismaMock() {
  return {
    masterDataImportRun: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    masterRegion: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}
