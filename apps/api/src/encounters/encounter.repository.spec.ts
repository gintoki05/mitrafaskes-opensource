import { EncounterRepository } from './encounter.repository';
import type { PrismaService } from '../database/prisma.service';

describe('EncounterRepository allocators', () => {
  it('returns queue status counts for the full scoped day, independent of the selected filter', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    const prisma = {
      encounter: { findMany, count },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const repository = new EncounterRepository(prisma);
    const queueDate = new Date('2026-08-16T00:00:00.000Z');

    await expect(
      repository.findMany(
        {
          queueDate,
          locationIds: ['location-1'],
          statuses: ['WAITING', 'IN_PROGRESS'],
        },
        1,
        25,
      ),
    ).resolves.toEqual({
      records: [],
      total: 1,
      statusCounts: {
        WAITING: 1,
        IN_PROGRESS: 0,
        COMPLETED: 2,
        CANCELLED: 3,
      },
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          queueDate,
          locationId: { in: ['location-1'] },
          status: { in: ['WAITING', 'IN_PROGRESS'] },
        }),
      }),
    );
    expect(count).toHaveBeenNthCalledWith(2, {
      where: expect.objectContaining({
        queueDate,
        locationId: { in: ['location-1'] },
        status: 'WAITING',
      }),
    });
    expect(count).toHaveBeenNthCalledWith(5, {
      where: expect.objectContaining({
        queueDate,
        locationId: { in: ['location-1'] },
        status: 'CANCELLED',
      }),
    });
  });

  it('keeps uncompleted triage records in the nurse queue after consultation starts', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      encounter: { findMany, count },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const repository = new EncounterRepository(prisma);

    await repository.findMany(
      {
        queueDate: new Date('2026-08-16T00:00:00.000Z'),
        locationIds: ['location-1'],
        statuses: ['WAITING', 'IN_PROGRESS'],
        triageStatuses: ['NOT_STARTED', 'DRAFT'],
      },
      1,
      25,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['WAITING', 'IN_PROGRESS'] },
          OR: [
            { medicalRecord: null },
            {
              medicalRecord: {
                is: { triageStatus: { in: ['DRAFT'] } },
              },
            },
          ],
        }),
      }),
    );
  });

  it('formats a stable Encounter number with the facility year', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ value: 1n }])
        .mockResolvedValueOnce([{ value: 42n }]),
    };
    const repository = new EncounterRepository({} as PrismaService);

    await expect(
      repository.nextEncounterNumber(transaction as never, '2026'),
    ).resolves.toBe('ENC-2026-000001');
    await expect(
      repository.nextEncounterNumber(transaction as never, '2027'),
    ).resolves.toBe('ENC-2027-000042');
  });

  it('uses one database counter operation per queue allocation', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ lastIssuedNumber: 1 }])
        .mockResolvedValueOnce([{ lastIssuedNumber: 2 }]),
    };
    const repository = new EncounterRepository({} as PrismaService);
    const queueDate = new Date('2026-08-10T00:00:00.000Z');

    const numbers = await Promise.all([
      repository.nextQueueNumber(transaction as never, 'location-1', queueDate),
      repository.nextQueueNumber(transaction as never, 'location-1', queueDate),
    ]);

    expect(numbers).toEqual([1, 2]);
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('queries history inclusively with search fields and newest-first ordering', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      encounter: { findMany, count },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const repository = new EncounterRepository(prisma);
    const fromDate = new Date('2026-08-01T00:00:00.000Z');
    const toDate = new Date('2026-08-13T00:00:00.000Z');

    await expect(
      repository.findHistory(
        {
          fromDate,
          toDate,
          search: 'Siti Aminah',
          status: 'COMPLETED',
        },
        2,
        25,
      ),
    ).resolves.toEqual({ records: [], total: 0 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          queueDate: { gte: fromDate, lte: toDate },
          status: 'COMPLETED',
          OR: expect.any(Array),
        }),
        orderBy: [
          { queueDate: 'desc' },
          { queueNumber: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: 25,
        take: 25,
      }),
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          queueDate: { gte: fromDate, lte: toDate },
        }),
      }),
    );
  });
});
