import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import { SatusehatLocationService } from './satusehat-location.service';

const timestamps = {
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
};

const organization = {
  id: 'org-1',
  name: 'Klinik Mitra Sehat',
};

const location = {
  id: 'location-1',
  organizationId: 'org-1',
  parentId: null,
  code: 'ROOM-01',
  name: 'Ruang Pemeriksaan 1',
  type: 'ROOM' as const,
  description: 'Ruang konsultasi',
  status: 'ACTIVE' as const,
  mode: 'INSTANCE' as const,
  physicalTypeCode: 'RO',
  addressText: 'Jl. Sehat No. 1',
  city: 'Jakarta',
  postalCode: '12950',
  countryCode: 'ID',
  latitude: -6.231154,
  longitude: 106.832398,
  altitude: 12,
  active: true,
  ...timestamps,
  organization,
  parent: null,
};

describe('SatusehatLocationService', () => {
  const originalEnvironment = process.env.SATUSEHAT_ENVIRONMENT;

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.SATUSEHAT_ENVIRONMENT;
    } else {
      process.env.SATUSEHAT_ENVIRONMENT = originalEnvironment;
    }
  });

  it('requires the managing Organization to be linked', async () => {
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue(location);
    prisma.externalResourceLink.findUnique.mockResolvedValue(null);
    const fhir = createFhirMock();
    const service = new SatusehatLocationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    await expect(service.previewLocation('location-1')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_ORGANIZATION_NOT_SYNCED',
      }),
    });
    expect(fhir.createLocation).not.toHaveBeenCalled();
  });

  it('requires a parent Location to be linked before previewing a child', async () => {
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue({
      ...location,
      parentId: 'location-parent',
      parent: { id: 'location-parent', name: 'Gedung Utama' },
    });
    prisma.externalResourceLink.findUnique.mockImplementation(
      ({ where }: { where: { localResourceScope: { resourceType: string } } }) =>
        Promise.resolve(
          where.localResourceScope.resourceType === 'Organization'
            ? { externalResourceId: '100000004' }
            : null,
        ),
    );
    const service = new SatusehatLocationService(
      prisma as unknown as PrismaService,
      createFhirMock() as unknown as SatusehatFhirClient,
    );

    await expect(service.previewLocation('location-1')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_LOCATION_PARENT_NOT_SYNCED',
      }),
    });
  });

  it('POSTs a new Location and stores the returned external ID', async () => {
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue(location);
    prisma.externalResourceLink.findUnique.mockImplementation(
      ({ where }: { where: { localResourceScope: { resourceType: string } } }) =>
        Promise.resolve(
          where.localResourceScope.resourceType === 'Organization'
            ? { externalResourceId: '100000004' }
            : null,
        ),
    );
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-1' });
    const fhir = createFhirMock();
    fhir.createLocation.mockResolvedValue({
      resourceType: 'Location',
      id: 'location-external-1',
    });
    const service = new SatusehatLocationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    const result = await service.syncLocation('location-1');

    expect(result).toEqual(
      expect.objectContaining({
        operation: 'CREATE',
        externalResourceId: 'location-external-1',
        syncedRemotely: true,
        syncLogId: 'sync-1',
      }),
    );
    expect(fhir.createLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Location',
        managingOrganization: { reference: 'Organization/100000004', display: organization.name },
      }),
    );
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resourceType: 'Location',
          localResourceType: 'Location',
          externalResourceId: 'location-external-1',
        }),
      }),
    );
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SUCCESS',
          satusehatId: 'location-external-1',
        }),
      }),
    );
  });

  it('allows sync without coordinates and omits position', async () => {
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue({
      ...location,
      latitude: undefined,
      longitude: undefined,
    });
    prisma.externalResourceLink.findUnique.mockImplementation(
      ({ where }: { where: { localResourceScope: { resourceType: string } } }) =>
        Promise.resolve(
          where.localResourceScope.resourceType === 'Organization'
            ? { externalResourceId: '100000004' }
            : null,
        ),
    );
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-no-position' });
    const fhir = createFhirMock();
    fhir.createLocation.mockResolvedValue({
      resourceType: 'Location',
      id: 'location-external-no-position',
    });
    const service = new SatusehatLocationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    await service.syncLocation('location-1');

    expect(fhir.createLocation).toHaveBeenCalledWith(
      expect.not.objectContaining({ position: expect.anything() }),
    );
  });

  it('PUTs a linked Location on subsequent syncs', async () => {
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue(location);
    prisma.externalResourceLink.findUnique.mockImplementation(
      ({ where }: { where: { localResourceScope: { resourceType: string } } }) =>
        Promise.resolve({
          externalResourceId:
            where.localResourceScope.resourceType === 'Organization'
              ? '100000004'
              : 'location-external-1',
        }),
    );
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-2' });
    const fhir = createFhirMock();
    fhir.updateLocation.mockResolvedValue({
      resourceType: 'Location',
      id: 'location-external-1',
    });
    const service = new SatusehatLocationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    const result = await service.syncLocation('location-1');

    expect(result.operation).toBe('UPDATE');
    expect(fhir.updateLocation).toHaveBeenCalledWith(
      'location-external-1',
      expect.objectContaining({ id: 'location-external-1' }),
    );
    expect(fhir.createLocation).not.toHaveBeenCalled();
  });

  it('marks the sync log failed when the remote request fails', async () => {
    const prisma = createPrismaMock();
    prisma.location.findUnique.mockResolvedValue(location);
    prisma.externalResourceLink.findUnique.mockImplementation(
      ({ where }: { where: { localResourceScope: { resourceType: string } } }) =>
        Promise.resolve(
          where.localResourceScope.resourceType === 'Organization'
            ? { externalResourceId: '100000004' }
            : null,
        ),
    );
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-failed' });
    const fhir = createFhirMock();
    fhir.createLocation.mockRejectedValue(
      new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        'Remote gagal',
        422,
        {
          resourceType: 'OperationOutcome',
          issues: [{ severity: 'error', code: 'invalid' }],
        },
      ),
    );
    const service = new SatusehatLocationService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
    );

    await expect(service.syncLocation('location-1')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        operationOutcome: {
          resourceType: 'OperationOutcome',
          issues: [{ severity: 'error', code: 'invalid' }],
        },
      }),
    });
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
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
    createLocation: jest.fn(),
    updateLocation: jest.fn(),
  };
}
