import { PrismaService } from '../database/prisma.service';
import { SatusehatFhirClient } from '../satusehat/satusehat-fhir.client';
import { SatusehatOrganizationLinkService } from './satusehat-organization-link.service';

const timestamps = {
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
};

const rootOrganization = {
  id: 'org-root',
  code: 'KLINIK-UTAMA',
  name: 'Klinik Mitra Sehat',
  type: 'HEALTHCARE_FACILITY' as const,
  parentId: null,
  addressText: 'Jl. Sehat No. 1',
  phone: null,
  email: null,
  active: true,
  ...timestamps,
  parent: null,
};

const childOrganization = {
  id: 'org-child',
  code: 'POLI-UMUM',
  name: 'Poli Umum',
  type: 'SUB_ORGANIZATION' as const,
  parentId: 'org-root',
  addressText: null,
  phone: null,
  email: null,
  active: true,
  ...timestamps,
  parent: rootOrganization,
};

describe('SatusehatOrganizationLinkService', () => {
  const originalOrganizationId = process.env.SATUSEHAT_ORGANIZATION_ID;
  const originalEnvironment = process.env.SATUSEHAT_ENVIRONMENT;

  afterEach(() => {
    if (originalOrganizationId === undefined) {
      delete process.env.SATUSEHAT_ORGANIZATION_ID;
    } else {
      process.env.SATUSEHAT_ORGANIZATION_ID = originalOrganizationId;
    }
    if (originalEnvironment === undefined) {
      delete process.env.SATUSEHAT_ENVIRONMENT;
    } else {
      process.env.SATUSEHAT_ENVIRONMENT = originalEnvironment;
    }
  });

  it('links an existing sub-organization without creating a remote resource', async () => {
    process.env.SATUSEHAT_ORGANIZATION_ID = '100000004';
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'org-child' ? childOrganization : rootOrganization,
        ),
    );
    const fhir = createFhirMock();
    fhir.getOrganization.mockResolvedValue({
      resourceType: 'Organization',
      id: 'remote-child',
      name: 'Poli Umum',
      active: true,
      partOf: { reference: 'Organization/100000004' },
    });
    const service = new SatusehatOrganizationLinkService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    await expect(
      service.linkExistingOrganization('org-child', {
        externalResourceId: 'remote-child',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'LINK_EXISTING',
        localResourceId: 'org-child',
        externalResourceId: 'remote-child',
      }),
    );
    expect(fhir.createOrganization).not.toHaveBeenCalled();
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalled();
    const upsertCalls = prisma.externalResourceLink.upsert.mock
      .calls as unknown[][];
    expect(upsertCalls[0]?.[0]).toMatchObject({
      create: {
        localResourceId: 'org-child',
        externalResourceId: 'remote-child',
      },
    });
  });
});

function createPrismaMock() {
  return {
    healthcareOrganization: {
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
    getOrganization: jest.fn(),
    createOrganization: jest.fn(),
  };
}
