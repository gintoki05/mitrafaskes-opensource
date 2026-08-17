import type { Prisma } from '@prisma/client';
import { replaceDraftHistories } from './rme.persistence';

describe('RME clinical history persistence', () => {
  it('keeps scoped child IDs, creates new rows, and removes deleted rows', async () => {
    const delegate = {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'history-existing' },
          { id: 'history-removed' },
        ]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const transaction = {
      clinicalHistoryEntry: delegate,
    } as unknown as Prisma.TransactionClient;

    await replaceDraftHistories(transaction, 'rme-1', [
      {
        id: 'history-existing',
        category: 'PAST_MEDICAL',
        text: 'Hipertensi',
        status: 'ACTIVE',
      },
      {
        id: 'history-from-other-record',
        category: 'RISK',
        text: 'Merokok',
      },
    ]);

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 'history-existing' },
      data: {
        category: 'PAST_MEDICAL',
        text: 'Hipertensi',
        status: 'ACTIVE',
        onsetAt: null,
        note: null,
      },
    });
    expect(delegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        medicalRecordId: 'rme-1',
        category: 'RISK',
        text: 'Merokok',
      }),
    });
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['history-removed'] } },
    });
  });
});
