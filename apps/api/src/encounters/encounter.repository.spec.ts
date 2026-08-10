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
});
