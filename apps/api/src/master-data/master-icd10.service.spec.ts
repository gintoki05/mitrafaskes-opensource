import { MasterIcd10Service } from './master-icd10.service';

describe('MasterIcd10Service', () => {
  it('reads active local terminology and applies case-insensitive search', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        code: 'J00',
        display: 'Acute nasopharyngitis',
        nameIndo: 'Nasofaringitis Akut',
        nameEng: 'Acute nasopharyngitis',
        active: true,
        displayOrder: 20,
        source: 'SATUSEHAT',
        sourceVersion: 'ICD10_2010',
        createdAt: new Date('2026-08-09T00:00:00.000Z'),
        updatedAt: new Date('2026-08-09T00:00:00.000Z'),
      },
    ]);
    const service = new MasterIcd10Service({
      masterIcd10: { findMany },
    } as never);

    await expect(service.list('flu')).resolves.toEqual([
      {
        code: 'J00',
        display: 'Acute nasopharyngitis',
        nameIndo: 'Nasofaringitis Akut',
        nameEng: 'Acute nasopharyngitis',
        active: true,
        displayOrder: 20,
        source: 'SATUSEHAT',
        sourceVersion: 'ICD10_2010',
        createdAt: '2026-08-09T00:00:00.000Z',
        updatedAt: '2026-08-09T00:00:00.000Z',
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        OR: [
          { code: { contains: 'flu', mode: 'insensitive' } },
          { display: { contains: 'flu', mode: 'insensitive' } },
          { nameIndo: { contains: 'flu', mode: 'insensitive' } },
          { nameEng: { contains: 'flu', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  });
});
