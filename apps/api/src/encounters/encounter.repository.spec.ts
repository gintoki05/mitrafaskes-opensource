import { EncounterRepository } from './encounter.repository';
import type { PrismaService } from '../database/prisma.service';

describe('EncounterRepository allocators', () => {
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
