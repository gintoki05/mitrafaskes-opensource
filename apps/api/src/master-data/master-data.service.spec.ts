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
