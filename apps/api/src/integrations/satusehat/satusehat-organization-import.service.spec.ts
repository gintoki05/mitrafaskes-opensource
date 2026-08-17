import { PrismaService } from '../../database/prisma.service';
import { SatusehatFhirClient } from './satusehat-fhir.client';
import { SatusehatOrganizationImportService } from './satusehat-organization-import.service';

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

describe('SatusehatOrganizationImportService', () => {
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

  it('searches remote organizations by parent and reports existing local links', async () => {
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.externalResourceLink.findUnique.mockResolvedValue({
      localResourceId: 'org-child',
    });
    const fhir = createFhirMock();
    fhir.searchOrganizations.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [
        {
          resource: {
            resourceType: 'Organization',
            id: 'remote-child',
            name: 'Poli Umum',
            active: true,
            partOf: {
              reference: 'Organization/100000004',
              display: 'Klinik Mitra Sehat',
            },
          },
        },
      ],
    });
    const service = createService(prisma, fhir);

    await expect(
      service.searchOrganizations({ partOf: '100000004' }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          externalResourceId: 'remote-child',
          name: 'Poli Umum',
          parentExternalResourceId: '100000004',
          linkedLocalResourceId: 'org-child',
        }),
      ],
      total: 1,
    });
    expect(fhir.searchOrganizations).toHaveBeenCalledWith({
      name: undefined,
      partof: '100000004',
    });
  });

  it('imports a remote sub-organization under its linked local parent', async () => {
    process.env.SATUSEHAT_ORGANIZATION_ID = '100000004';
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockResolvedValue(
      rootOrganization,
    );
    const fhir = createFhirMock();
    fhir.getOrganization.mockResolvedValue({
      resourceType: 'Organization',
      id: 'remote-child',
      name: 'Poli Umum',
      active: true,
      partOf: { reference: 'Organization/100000004' },
    });
    const importedOrganization = {
      ...childOrganization,
      id: 'org-imported',
      code: 'POLI-UMUM-REMOTE',
    };
    const masterData = {
      createOrganization: jest.fn().mockResolvedValue(importedOrganization),
    };
    const service = new SatusehatOrganizationImportService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      masterData as never,
    );

    await expect(
      service.importOrganization({
        externalResourceId: 'remote-child',
        code: 'POLI-UMUM-REMOTE',
        parentId: 'org-root',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'IMPORT',
        localResourceId: 'org-imported',
        externalResourceId: 'remote-child',
      }),
    );
    expect(masterData.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'POLI-UMUM-REMOTE',
        name: 'Poli Umum',
        type: 'SUB_ORGANIZATION',
        parentId: 'org-root',
      }),
    );
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalled();
    const upsertCalls = prisma.externalResourceLink.upsert.mock
      .calls as unknown[][];
    expect(upsertCalls[0]?.[0]).toMatchObject({
      create: {
        localResourceId: 'org-imported',
        externalResourceId: 'remote-child',
      },
    });
  });

  it('does not block import when an optional remote contact is invalid', async () => {
    process.env.SATUSEHAT_ORGANIZATION_ID = '100000004';
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.getOrganization.mockResolvedValue({
      resourceType: 'Organization',
      id: '100000004',
      name: 'Klinik Mitra Sehat',
      active: true,
      telecom: [{ system: 'phone', value: 'Telepon belum tersedia' }],
    });
    const importedOrganization = {
      ...rootOrganization,
      id: 'org-imported',
      code: 'FASKES-UTAMA',
    };
    const masterData = {
      createOrganization: jest.fn().mockResolvedValue(importedOrganization),
    };
    const service = new SatusehatOrganizationImportService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      masterData as never,
    );

    await expect(
      service.importOrganization({
        externalResourceId: '100000004',
        code: 'FASKES-UTAMA',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'IMPORT',
        localResourceId: 'org-imported',
      }),
    );
    expect(masterData.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: undefined,
      }),
    );
  });
});

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  fhir: ReturnType<typeof createFhirMock>,
) {
  return new SatusehatOrganizationImportService(
    prisma as unknown as PrismaService,
    fhir as unknown as SatusehatFhirClient,
    { createOrganization: jest.fn() } as never,
  );
}

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
    searchOrganizations: jest.fn(),
    createOrganization: jest.fn(),
  };
}
