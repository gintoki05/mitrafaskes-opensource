import { PrismaService } from '../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from '../satusehat/satusehat-fhir.client';
import { PractitionersService } from './practitioners.service';
import { SatusehatPractitionerService } from './satusehat-practitioner.service';

const localPractitioner = {
  id: 'user-doctor-1',
  username: 'dr_alexander',
  fullName: 'dr. Alexander',
  role: 'DOKTER' as const,
  nik: '7209061211900001',
  birthDate: new Date('1994-01-01T00:00:00.000Z'),
  gender: 'MALE' as const,
  active: true,
  sipNumber: 'SIP-1',
  strNumber: 'STR-1',
  createdAt: new Date('2026-08-07T00:00:00.000Z'),
  updatedAt: new Date('2026-08-07T00:00:00.000Z'),
};

describe('SatusehatPractitionerService', () => {
  const originalEnvironment = process.env.SATUSEHAT_ENVIRONMENT;

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.SATUSEHAT_ENVIRONMENT;
    } else {
      process.env.SATUSEHAT_ENVIRONMENT = originalEnvironment;
    }
  });

  it('looks up draft data by NIK before a local Practitioner is created', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.searchPractitioners.mockResolvedValue({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Practitioner',
            id: '10009880728',
            name: [{ text: 'dr. Alexander' }],
            gender: 'male',
            birthDate: '1994-01-01',
            identifier: [
              { system: 'https://fhir.kemkes.go.id/id/nik', value: localPractitioner.nik },
              {
                system: 'https://fhir.kemkes.go.id/id/nakes-his-number',
                value: '10009880728',
              },
            ],
          },
        },
      ],
    });

    const service = new SatusehatPractitionerService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      createPractitionerMock() as unknown as PractitionersService,
    );

    await expect(
      service.lookupForDraft({
        identifierType: 'NIK',
        identifier: localPractitioner.nik,
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          externalResourceId: '10009880728',
          name: localPractitioner.fullName,
          birthDate: '1994-01-01',
          gender: 'male',
        }),
      ],
      total: 1,
    });
    expect(fhir.searchPractitioners).toHaveBeenCalledWith({
      identifier: 'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    });
  });

  it('looks up draft data by Nomor IHS without creating or linking local data', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.getPractitioner.mockResolvedValue({
      resourceType: 'Practitioner',
      id: '10009880728',
      name: [{ text: 'dr. Alexander' }],
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/nakes-his-number',
          value: '10009880728',
        },
      ],
    });
    const practitioners = createPractitionerMock();
    const service = new SatusehatPractitionerService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      practitioners as unknown as PractitionersService,
    );

    await expect(
      service.lookupForDraft({
        identifierType: 'IHS',
        identifier: '10009880728',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({ externalResourceId: '10009880728' }),
      ],
      total: 1,
    });
    expect(fhir.getPractitioner).toHaveBeenCalledWith('10009880728');
    expect(practitioners.getPractitionerForSatusehat).not.toHaveBeenCalled();
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
  });

  it('searches by local NIK and links the selected remote Practitioner', async () => {
    process.env.SATUSEHAT_ENVIRONMENT = 'sandbox';
    const prisma = createPrismaMock();
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-1' });
    prisma.satusehatSyncLog.findFirst.mockResolvedValue({
      resourceId: localPractitioner.id,
      status: 'SUCCESS',
      errorMessage: null,
      updatedAt: new Date('2026-08-07T00:00:00.000Z'),
    });
    const fhir = createFhirMock();
    fhir.searchPractitioners.mockResolvedValue({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Practitioner',
            id: '10009880728',
            name: [{ text: 'dr. Alexander' }],
          },
        },
      ],
    });
    fhir.getPractitioner.mockResolvedValue({
      resourceType: 'Practitioner',
      id: '81dfcb5d-83b2-400f-bfe7-000e6ad38d85',
      active: true,
      gender: 'male',
      birthDate: '1994-01-01',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/nakes-his-number',
          value: '10009880728',
        },
      ],
      name: [{ text: 'dr. Alexander' }],
    });
    const practitioners = createPractitionerMock();
    practitioners.getPractitionerForSatusehat.mockResolvedValue(localPractitioner);
    practitioners.findLinkageByExternalId.mockResolvedValue(null);
    practitioners.findById.mockResolvedValue({
      id: localPractitioner.id,
      username: localPractitioner.username,
      fullName: localPractitioner.fullName,
      role: 'DOKTER',
      nik: localPractitioner.nik,
      active: true,
      satusehat: {
        externalResourceId: '10009880728',
        lastSyncedAt: '2026-08-07T00:00:00.000Z',
      },
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T00:00:00.000Z',
    });

    const service = new SatusehatPractitionerService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      practitioners as unknown as PractitionersService,
    );

    await expect(service.searchForLocal(localPractitioner.id)).resolves.toEqual({
      items: [
        expect.objectContaining({
          externalResourceId: '10009880728',
          name: 'dr. Alexander',
        }),
      ],
      total: 1,
    });
    expect(fhir.searchPractitioners).toHaveBeenCalledWith({
      identifier: 'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    });

    await expect(
      service.linkExisting(localPractitioner.id, {
        externalResourceId: '10009880728',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'LINK_EXISTING',
        localResourceId: localPractitioner.id,
        externalResourceId: '10009880728',
      }),
    );
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resourceType: 'Practitioner',
          localResourceType: 'User',
          localResourceId: localPractitioner.id,
          externalResourceId: '10009880728',
        }),
      }),
    );
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SUCCESS',
          satusehatId: '10009880728',
        }),
      }),
    );
  });

  it('records a failed remote lookup without deleting an existing linkage', async () => {
    const prisma = createPrismaMock();
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-failed' });
    const fhir = createFhirMock();
    fhir.getPractitioner.mockRejectedValue(
      new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        'Practitioner SATUSEHAT tidak ditemukan',
        404,
      ),
    );
    const practitioners = createPractitionerMock();
    practitioners.getPractitionerForSatusehat.mockResolvedValue(localPractitioner);
    practitioners.findLinkageByExternalId.mockResolvedValue({
      localResourceId: localPractitioner.id,
      externalResourceId: '10009880728',
    });

    const service = new SatusehatPractitionerService(
      prisma as unknown as PrismaService,
      fhir as unknown as SatusehatFhirClient,
      practitioners as unknown as PractitionersService,
    );

    await expect(
      service.linkExisting(localPractitioner.id, {
        externalResourceId: '10009880728',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
      }),
    });
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sync-failed' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });
});

describe('PractitionersService create flow', () => {
  it('creates a local Practitioner profile before SATUSEHAT linking', async () => {
    const prisma = createPrismaMock();
    prisma.user.create.mockResolvedValue(localPractitioner);

    const service = new PractitionersService(prisma as unknown as PrismaService);

    await expect(
      service.create({
        username: localPractitioner.username,
        password: 'Temporary123!',
        fullName: localPractitioner.fullName,
        role: localPractitioner.role,
        nik: localPractitioner.nik,
        birthDate: '1994-01-01',
        gender: localPractitioner.gender,
      }),
    ).resolves.toMatchObject({
      id: localPractitioner.id,
      fullName: localPractitioner.fullName,
      nik: localPractitioner.nik,
      role: 'DOKTER',
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: localPractitioner.username,
          passwordHash: expect.any(String),
          fullName: localPractitioner.fullName,
          role: 'DOKTER',
          nik: localPractitioner.nik,
        }),
        include: expect.objectContaining({
          organization: expect.any(Object),
          location: expect.any(Object),
        }),
      }),
    );
  });

  it('rejects a Location from a different Organization', async () => {
    const prisma = createPrismaMock();
    prisma.healthcareOrganization.findUnique.mockResolvedValue({ id: 'organization-1' });
    prisma.location.findUnique.mockResolvedValue({
      id: 'location-1',
      organizationId: 'organization-2',
    });

    const service = new PractitionersService(prisma as unknown as PrismaService);

    await expect(
      service.create({
        username: 'perawat_lokal',
        password: 'Temporary123!',
        fullName: 'Perawat Lokal',
        role: 'PERAWAT',
        organizationId: 'organization-1',
        locationId: 'location-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PRACTITIONER_LOCATION_ORGANIZATION_MISMATCH',
      }),
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

function createPrismaMock() {
  return {
    user: {
      create: jest.fn(),
    },
    healthcareOrganization: {
      findUnique: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
    externalResourceLink: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    satusehatSyncLog: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
}

function createFhirMock() {
  return {
    searchPractitioners: jest.fn(),
    getPractitioner: jest.fn(),
  };
}

function createPractitionerMock() {
  return {
    getPractitionerForSatusehat: jest.fn(),
    findLinkageByExternalId: jest.fn(),
    findById: jest.fn(),
  };
}
