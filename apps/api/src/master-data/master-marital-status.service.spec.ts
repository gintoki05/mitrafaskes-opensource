import { MasterMaritalStatusService } from './master-marital-status.service';

describe('MasterMaritalStatusService', () => {
  it('reads active local terminology in display order', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        code: 'S',
        display: 'Belum menikah',
        active: true,
        displayOrder: 10,
        source: 'LOCAL_SNAPSHOT',
        sourceVersion: '2026.08-marital-status-baseline-1',
        createdAt: new Date('2026-08-09T00:00:00.000Z'),
        updatedAt: new Date('2026-08-09T00:00:00.000Z'),
      },
    ]);
    const service = new MasterMaritalStatusService({
      masterMaritalStatus: { findMany },
    } as never);

    await expect(service.list()).resolves.toEqual([
      {
        code: 'S',
        display: 'Belum menikah',
        active: true,
        displayOrder: 10,
        source: 'LOCAL_SNAPSHOT',
        sourceVersion: '2026.08-marital-status-baseline-1',
        createdAt: '2026-08-09T00:00:00.000Z',
        updatedAt: '2026-08-09T00:00:00.000Z',
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }, { display: 'asc' }, { code: 'asc' }],
    });
  });
});
