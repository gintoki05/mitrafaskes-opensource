import { MasterDataService } from './master-data.service';

describe('MasterDataService hierarchy invariants', () => {
  it('rejects an organization update that creates a cycle', async () => {
    const prisma = {
      healthcareOrganization: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          if (where.id === 'org-a') {
            return Promise.resolve({ id: 'org-a', parentId: 'org-b' });
          }
          if (where.id === 'org-b') {
            return Promise.resolve({ id: 'org-b', parentId: 'org-a' });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
    };
    const service = new MasterDataService(prisma as never);

    await expect(
      service.updateOrganization('org-a', {
        code: 'ORG-A',
        name: 'Organisasi A',
        type: 'SUB_ORGANIZATION',
        parentId: 'org-b',
      }),
    ).rejects.toThrow(
      'Organisasi tidak dapat dipindahkan menjadi anak dari turunannya',
    );
    expect(prisma.healthcareOrganization.update).not.toHaveBeenCalled();
  });

  it('rejects a service unit update that creates a cycle', async () => {
    const prisma = {
      healthcareOrganization: {
        findUnique: jest.fn(() => Promise.resolve({ id: 'org-1' })),
      },
      serviceUnit: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          if (where.id === 'unit-a') {
            return Promise.resolve({
              id: 'unit-a',
              organizationId: 'org-1',
              parentId: 'unit-b',
            });
          }
          if (where.id === 'unit-b') {
            return Promise.resolve({
              id: 'unit-b',
              organizationId: 'org-1',
              parentId: 'unit-a',
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
    };
    const service = new MasterDataService(prisma as never);

    await expect(
      service.updateServiceUnit('unit-a', {
        organizationId: 'org-1',
        parentId: 'unit-b',
        code: 'UNIT-A',
        name: 'Unit A',
        type: 'POLYCLINIC',
      }),
    ).rejects.toThrow(
      'Unit layanan tidak dapat dipindahkan menjadi anak dari turunannya',
    );
    expect(prisma.serviceUnit.update).not.toHaveBeenCalled();
  });

  it('rejects a location update that creates a cycle', async () => {
    const prisma = {
      healthcareOrganization: {
        findUnique: jest.fn(() => Promise.resolve({ id: 'org-1' })),
      },
      serviceUnit: {
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
      location: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          if (where.id === 'location-a') {
            return Promise.resolve({
              id: 'location-a',
              organizationId: 'org-1',
              parentId: 'location-b',
            });
          }
          if (where.id === 'location-b') {
            return Promise.resolve({
              id: 'location-b',
              organizationId: 'org-1',
              parentId: 'location-a',
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
    };
    const service = new MasterDataService(prisma as never);

    await expect(
      service.updateLocation('location-a', {
        organizationId: 'org-1',
        parentId: 'location-b',
        code: 'ROOM-A',
        name: 'Ruang A',
        type: 'ROOM',
      }),
    ).rejects.toThrow(
      'Lokasi tidak dapat dipindahkan menjadi anak dari turunannya',
    );
    expect(prisma.location.update).not.toHaveBeenCalled();
  });
});

describe('MasterDataService list queries', () => {
  it('returns paginated organizations with search, status, and sorting', async () => {
    const organization = {
      id: 'org-1',
      code: 'KLINIK-1',
      name: 'Klinik Mitra',
      type: 'HEALTHCARE_FACILITY',
      parentId: null,
      addressText: 'Jakarta',
      phone: null,
      email: null,
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const findMany = jest.fn().mockResolvedValue([organization]);
    const count = jest.fn().mockResolvedValue(21);
    const service = new MasterDataService({
      healthcareOrganization: { findMany, count },
      externalResourceLink: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);

    const result = await service.findOrganizations({
      search: 'mitra',
      active: true,
      page: 2,
      pageSize: 10,
      sort: 'code',
      direction: 'desc',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ code: 'desc' }, { name: 'asc' }],
        where: expect.objectContaining({
          active: true,
          OR: expect.arrayContaining([
            { code: { contains: 'mitra', mode: 'insensitive' } },
            { name: { contains: 'mitra', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
    expect(count).toHaveBeenCalledWith(expect.any(Object));
    expect(result).toEqual({
      items: [
        expect.objectContaining({ id: 'org-1', name: 'Klinik Mitra' }),
      ],
      meta: { page: 2, pageSize: 10, total: 21 },
    });
  });

  it('applies organization and service-unit filters to locations', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = new MasterDataService({
      location: { findMany, count },
      externalResourceLink: { findMany: jest.fn().mockResolvedValue([]) },
    } as never);

    await service.findLocations({
      organizationId: 'org-1',
      serviceUnitId: 'unit-1',
      status: 'SUSPENDED',
      type: 'ROOM',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          serviceUnitId: 'unit-1',
          status: 'SUSPENDED',
          type: 'ROOM',
        },
      }),
    );
  });

  it('caps an oversized page request at the API maximum', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = new MasterDataService({
      serviceUnit: { findMany, count },
    } as never);

    const result = await service.findServiceUnits({ page: 0, pageSize: 999 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
    expect(result.meta).toEqual({ page: 1, pageSize: 100, total: 0 });
  });

  it('includes the SATUSEHAT linkage on organization and location summaries', async () => {
    const organization = {
      id: 'org-1',
      code: 'KLINIK-1',
      name: 'Klinik Mitra',
      type: 'HEALTHCARE_FACILITY',
      parentId: null,
      addressText: null,
      phone: null,
      email: null,
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const location = {
      id: 'location-1',
      organizationId: 'org-1',
      serviceUnitId: null,
      parentId: null,
      code: 'ROOM-1',
      name: 'Ruang 1',
      type: 'ROOM',
      description: null,
      status: 'ACTIVE',
      mode: 'INSTANCE',
      physicalTypeCode: null,
      addressText: null,
      city: null,
      postalCode: null,
      countryCode: 'IDN',
      latitude: null,
      longitude: null,
      altitude: null,
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const organizationFindMany = jest.fn().mockResolvedValue([organization]);
    const locationFindMany = jest.fn().mockResolvedValue([location]);
    const linkFindMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          localResourceId: 'org-1',
          externalResourceId: 'sat-org-1',
          lastSyncedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          localResourceId: 'location-1',
          externalResourceId: 'sat-location-1',
          lastSyncedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      ]);
    const service = new MasterDataService({
      healthcareOrganization: {
        findMany: organizationFindMany,
      },
      location: { findMany: locationFindMany },
      serviceUnit: { findMany: jest.fn().mockResolvedValue([]) },
      externalResourceLink: { findMany: linkFindMany },
    } as never);

    const result = await service.findAll();

    expect(result.organizations[0].satusehat).toEqual({
      externalResourceId: 'sat-org-1',
      lastSyncedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(result.locations[0].satusehat).toEqual({
      externalResourceId: 'sat-location-1',
      lastSyncedAt: '2026-01-03T00:00:00.000Z',
    });
  });
});
