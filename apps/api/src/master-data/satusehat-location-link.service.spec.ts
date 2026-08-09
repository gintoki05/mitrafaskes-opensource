import { PrismaService } from '../database/prisma.service';
import { SatusehatFhirClient } from '../satusehat/satusehat-fhir.client';
import { SatusehatLocationLinkService } from './satusehat-location-link.service';

const location = {
  id: 'location-local',
  organizationId: 'org-local',
  parentId: null,
  code: 'POLI-UMUM',
  name: 'Poli Umum',
  type: 'ROOM' as const,
  description: null,
  status: 'ACTIVE' as const,
  mode: 'INSTANCE' as const,
  physicalTypeCode: 'RO',
  addressText: null,
  city: null,
  postalCode: null,
  countryCode: 'ID',
  latitude: -6.2,
  longitude: 106.8,
  altitude: null,
  active: true,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  organization: { id: 'org-local', name: 'Klinik Mitra Sehat' },
  parent: null,
};

describe('SatusehatLocationLinkService', () => {
  const originalEnvironment = process.env.SATUSEHAT_ENVIRONMENT;

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.SATUSEHAT_ENVIRONMENT;
    } else {
      process.env.SATUSEHAT_ENVIRONMENT = originalEnvironment;
    }
  });

  it('links a local Location to an existing remote resource', async () => {
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue(location);
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
    });
    const service = new SatusehatLocationLinkService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    await expect(
      service.linkExistingLocation('location-local', {
        externalResourceId: 'remote-location',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'LINK_EXISTING',
        localResourceId: 'location-local',
        externalResourceId: 'remote-location',
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

function createPrismaMock() {
  return {
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
  };
}
