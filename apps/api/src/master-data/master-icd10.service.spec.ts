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
    const count = jest.fn().mockResolvedValue(1);
    const service = new MasterIcd10Service({
      masterIcd10: { findMany, count },
    } as never);

    await expect(
      service.list({ search: 'flu', page: 2, pageSize: 25 }),
    ).resolves.toEqual({
      items: [
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
      ],
      meta: { page: 2, pageSize: 25, total: 1 },
    });
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
      skip: 25,
      take: 25,
    });
    expect(count).toHaveBeenCalledWith({
      where: {
        active: true,
        OR: [
          { code: { contains: 'flu', mode: 'insensitive' } },
          { display: { contains: 'flu', mode: 'insensitive' } },
          { nameIndo: { contains: 'flu', mode: 'insensitive' } },
          { nameEng: { contains: 'flu', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('loads selected active codes without reading the full snapshot', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        code: 'J00',
        display: 'Acute nasopharyngitis',
        nameIndo: null,
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

    await expect(service.findByCodes(['J00', 'J00', ' '])).resolves.toEqual([
      {
        code: 'J00',
        display: 'Acute nasopharyngitis',
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
      where: { active: true, code: { in: ['J00'] } },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  });
});
