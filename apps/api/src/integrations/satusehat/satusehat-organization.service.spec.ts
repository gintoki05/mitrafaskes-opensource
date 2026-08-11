import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SatusehatFhirClient } from './satusehat-fhir.client';
import { SatusehatOrganizationService } from './satusehat-organization.service';

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

describe('SatusehatOrganizationService', () => {
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

  it('links the local root facility to the configured SATUSEHAT Organization ID without POSTing it', async () => {
    process.env.SATUSEHAT_ORGANIZATION_ID = '100000004';
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockResolvedValue(
      rootOrganization,
    );
    prisma.externalResourceLink.findUnique.mockResolvedValue(null);
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-root' });
    const fhir = createFhirMock();
    fhir.getOrganization.mockResolvedValue({
      resourceType: 'Organization',
      id: '100000004',
    });
    const service = new SatusehatOrganizationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    const result = await service.syncOrganization('org-root');

    expect(result).toEqual(
      contains({
        operation: 'LINK_EXISTING_ROOT',
        externalResourceId: '100000004',
        syncedRemotely: true,
        syncLogId: 'sync-root',
      }),
    );
    expect(fhir.getOrganization).toHaveBeenCalledWith('100000004');
    expect(fhir.createOrganization).not.toHaveBeenCalled();
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalledWith(
      contains({
        create: contains({ externalResourceId: '100000004' }),
      }),
    );
  });

  it('POSTs a sub-organization and stores the returned external ID', async () => {
    process.env.SATUSEHAT_ORGANIZATION_ID = '100000004';
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'org-child' ? childOrganization : rootOrganization,
        ),
    );
    prisma.externalResourceLink.findUnique.mockResolvedValue(null);
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-1' });
    const fhir = createFhirMock();
    fhir.createOrganization.mockResolvedValue({
      resourceType: 'Organization',
      id: 'org-child-external',
    });
    const service = new SatusehatOrganizationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    const result = await service.syncOrganization('org-child');

    expect(result).toEqual(
      contains({
        operation: 'CREATE',
        externalResourceId: 'org-child-external',
        syncedRemotely: true,
        syncLogId: 'sync-1',
      }),
    );
    expect(fhir.createOrganization).toHaveBeenCalledWith(
      contains({
        resourceType: 'Organization',
        name: 'Poli Umum',
        partOf: contains({
          reference: 'Organization/100000004',
        }),
      }),
    );
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalledWith(
      contains({
        create: contains({
          localResourceId: 'org-child',
          externalResourceId: 'org-child-external',
        }),
      }),
    );
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      contains({
        data: contains({
          status: 'SUCCESS',
          satusehatId: 'org-child-external',
        }),
      }),
    );
  });

  it('returns a clear message when the SATUSEHAT linkage is already used', async () => {
    process.env.SATUSEHAT_ORGANIZATION_ID = '100000004';
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockResolvedValue(
      rootOrganization,
    );
    prisma.externalResourceLink.findUnique.mockResolvedValue(null);
    prisma.externalResourceLink.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`provider`,`environment`,`resourceType`,`externalResourceId`)',
        {
          code: 'P2002',
          clientVersion: '5.10.0',
          meta: {
            target: [
              'provider',
              'environment',
              'resourceType',
              'externalResourceId',
            ],
          },
        },
      ),
    );
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-conflict' });
    const fhir = createFhirMock();
    fhir.getOrganization.mockResolvedValue({
      resourceType: 'Organization',
      id: '100000004',
    });
    const service = new SatusehatOrganizationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    await expect(service.syncOrganization('org-root')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_ORGANIZATION_LINK_CONFLICT',
        message:
          'Organization induk SATUSEHAT sudah terhubung ke fasilitas lokal lain. Gunakan fasilitas yang sudah terhubung atau ubah Organization ini menjadi SUB_ORGANIZATION.',
      }),
    });
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      contains({
        data: contains({
          status: 'FAILED',
          errorMessage:
            'Organization induk SATUSEHAT sudah terhubung ke fasilitas lokal lain. Gunakan fasilitas yang sudah terhubung atau ubah Organization ini menjadi SUB_ORGANIZATION.',
        }),
      }),
    );
  });
});

function createPrismaMock() {
  return {
    healthcareOrganization: {
      findUnique: jest.fn(),
    },
    externalResourceLink: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    satusehatSyncLog: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createFhirMock() {
  return {
    getOrganization: jest.fn(),
    createOrganization: jest.fn(),
    updateOrganization: jest.fn(),
  };
}

function contains(value: Record<string, unknown>): unknown {
  return expect.objectContaining(value);
}
