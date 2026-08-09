import { PrismaService } from '../database/prisma.service';
import { SatusehatFhirClient } from '../satusehat/satusehat-fhir.client';
import { MasterDataService } from './master-data.service';
import { SatusehatLocationImportService } from './satusehat-location-import.service';

const timestamps = {
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
};

const organization = {
  id: 'org-local',
  code: 'KLINIK-UTAMA',
  name: 'Klinik Mitra Sehat',
  type: 'HEALTHCARE_FACILITY' as const,
  parentId: null,
  addressText: null,
  phone: null,
  email: null,
  active: true,
  ...timestamps,
};

const importedLocation = {
  id: 'location-local',
  organizationId: 'org-local',
  parentId: null,
  code: 'POLI-UMUM',
  name: 'Poli Umum',
  type: 'ROOM' as const,
  description: 'Ruang pelayanan umum',
  status: 'ACTIVE' as const,
  mode: 'INSTANCE' as const,
  physicalTypeCode: 'RO',
  addressText: 'Jl. Sehat No. 1',
  city: 'Jakarta',
  postalCode: '12950',
  countryCode: 'ID',
  latitude: -6.2,
  longitude: 106.8,
  altitude: 12.5,
  active: true,
  createdAt: timestamps.createdAt.toISOString(),
  updatedAt: timestamps.updatedAt.toISOString(),
};

describe('SatusehatLocationImportService', () => {
  const originalEnvironment = process.env.SATUSEHAT_ENVIRONMENT;

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.SATUSEHAT_ENVIRONMENT;
    } else {
      process.env.SATUSEHAT_ENVIRONMENT = originalEnvironment;
    }
  });

  it('searches Locations by local organization and reports existing links', async () => {
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockResolvedValue(organization);
    prisma.externalResourceLink.findUnique.mockImplementation((input) => {
      const localScope = input.where.localResourceScope;
      if (localScope?.resourceType === 'Organization') {
        return Promise.resolve({
          localResourceId: 'org-local',
          localResourceType: 'HealthcareOrganization',
          externalResourceId: '100000004',
        });
      }
      if (input.where.externalResourceScope) {
        return Promise.resolve({
          localResourceId: 'location-local',
          localResourceType: 'Location',
        });
      }
      return Promise.resolve(null);
    });
    const fhir = createFhirMock();
    fhir.searchLocations.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [
        {
          resource: {
            resourceType: 'Location',
            id: 'remote-location',
            identifier: [
              {
                system: 'http://sys-ids.kemkes.go.id/location/100000004',
                value: 'POLI-UMUM',
              },
            ],
            name: 'Poli Umum',
            managingOrganization: { reference: 'Organization/100000004' },
          },
        },
      ],
    });
    const service = createService(prisma, fhir);

    await expect(
      service.searchLocations({
        name: 'Poli Umum',
        organizationLocalId: 'org-local',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          externalResourceId: 'remote-location',
          identifierValue: 'POLI-UMUM',
          linkedLocalResourceId: 'location-local',
        }),
      ],
      total: 1,
    });
    expect(fhir.searchLocations).toHaveBeenCalledWith({
      identifier: undefined,
      name: 'Poli Umum',
      organization: '100000004',
    });
  });

  it('imports a remote Location and stores its external link', async () => {
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockResolvedValue(organization);
    prisma.externalResourceLink.findUnique.mockImplementation((input) => {
      const localScope = input.where.localResourceScope;
      if (localScope?.resourceType === 'Organization') {
        return Promise.resolve({
          localResourceId: 'org-local',
          localResourceType: 'HealthcareOrganization',
          externalResourceId: '100000004',
        });
      }
      return Promise.resolve(null);
    });
    const fhir = createFhirMock();
    fhir.getLocation.mockResolvedValue({
      resourceType: 'Location',
      id: 'remote-location',
      identifier: [
        {
          system: 'http://sys-ids.kemkes.go.id/location/100000004',
          value: 'POLI-UMUM',
        },
      ],
      status: 'active',
      name: 'Poli Umum',
      mode: 'instance',
      physicalType: { coding: [{ code: 'ro', display: 'Room' }] },
      managingOrganization: { reference: 'Organization/100000004' },
      position: { latitude: -6.2, longitude: 106.8, altitude: 12.5 },
    });
    const masterData = {
      createLocation: jest.fn().mockResolvedValue(importedLocation),
    };
    const service = new SatusehatLocationImportService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      masterData as unknown as MasterDataService,
    );

    await expect(
      service.importLocation({
        externalResourceId: 'remote-location',
        organizationId: 'org-local',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'IMPORT',
        localResourceId: 'location-local',
        externalResourceId: 'remote-location',
      }),
    );
    expect(masterData.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-local',
        code: 'POLI-UMUM',
        name: 'Poli Umum',
        type: 'ROOM',
        latitude: -6.2,
        longitude: 106.8,
      }),
    );
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          localResourceId: 'location-local',
          externalResourceId: 'remote-location',
        }),
      }),
    );
  });
});

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  fhir: ReturnType<typeof createFhirMock>,
) {
  return new SatusehatLocationImportService(
    prisma as unknown as PrismaService,
    fhir as unknown as SatusehatFhirClient,
    { createLocation: jest.fn() } as unknown as MasterDataService,
  );
}

function createPrismaMock() {
  return {
    healthcareOrganization: {
      findUnique: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
    externalResourceLink: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn<(input: unknown) => Promise<void>>(),
    },
  };
}

function createFhirMock() {
  return {
    getLocation: jest.fn(),
    searchLocations: jest.fn(),
  };
}
