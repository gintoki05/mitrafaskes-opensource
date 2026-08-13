import type { Patient } from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  SatusehatFhirClient,
  SatusehatFhirError,
} from './satusehat-fhir.client';
import { PatientsService } from '../../patients/patients.service';
import { SatusehatPatientService } from './satusehat-patient.service';

const localPatient: Patient = {
  id: 'patient-local-1',
  nik: '7209061211900001',
  fullName: 'Siti Sehat',
  birthDate: '1990-01-01',
  gender: 'FEMALE' as Patient['gender'],
  medicalRecNo: 'RM-0001',
  active: true,
  version: 1,
  identifiers: [
    {
      id: 'identifier-1',
      type: 'NIK' as Patient['identifiers'][number]['type'],
      system: 'urn:id:nik',
      value: '7209061211900001',
      normalizedValue: '7209061211900001',
      verificationStatus:
        'UNVERIFIED' as Patient['identifiers'][number]['verificationStatus'],
      isPrimary: true,
      active: true,
    },
  ],
  names: [
    {
      id: 'name-1',
      use: 'OFFICIAL' as Patient['names'][number]['use'],
      text: 'Siti Sehat',
      given: ['Siti'],
      family: 'Sehat',
      prefix: [],
      suffix: [],
    },
  ],
  telecoms: [],
  addresses: [],
  relationships: [],
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

describe('SatusehatPatientService', () => {
  const originalEnvironment = process.env.SATUSEHAT_ENVIRONMENT;

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.SATUSEHAT_ENVIRONMENT;
    } else {
      process.env.SATUSEHAT_ENVIRONMENT = originalEnvironment;
    }
  });

  it('looks up an existing remote Patient by NIK without changing local linkage', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.searchPatients.mockResolvedValue({
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: 'P10000001',
            name: [{ text: 'Siti Sehat' }],
            identifier: [
              {
                system: 'https://fhir.kemkes.go.id/id/nik',
                value: localPatient.nik,
              },
            ],
          },
        },
      ],
    });

    const service = createService(prisma, fhir);

    await expect(
      service.lookupForDraft({
        identifierType: 'NIK',
        identifier: localPatient.nik,
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          externalResourceId: 'P10000001',
          name: 'Siti Sehat',
        }),
      ],
      total: 1,
    });
    expect(fhir.searchPatients).toHaveBeenCalledWith({
      identifier: 'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    });
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.create).not.toHaveBeenCalled();
  });

  it('looks up an existing remote Patient by Nomor IHS without changing local linkage', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.getPatient.mockResolvedValue({
      resourceType: 'Patient',
      id: 'P02478375538',
      name: [{ text: 'Ardianto Putra' }],
      gender: 'male',
      birthDate: '1992-01-09',
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/ihs-number',
          value: 'P02478375538',
        },
      ],
    });

    const service = createService(prisma, fhir);

    await expect(
      service.lookupForDraft({
        identifierType: 'IHS',
        identifier: 'P02478375538',
      }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          externalResourceId: 'P02478375538',
          name: 'Ardianto Putra',
          gender: 'male',
          birthDate: '1992-01-09',
        }),
      ],
      total: 1,
    });
    expect(fhir.getPatient).toHaveBeenCalledWith('P02478375538');
    expect(fhir.searchPatients).not.toHaveBeenCalled();
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.create).not.toHaveBeenCalled();
  });

  it('rejects invalid Patient lookup identifiers before calling FHIR', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    const service = createService(prisma, fhir);

    await expect(
      service.lookupForDraft({
        identifierType: 'NIK',
        identifier: '123',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_PATIENT_LOOKUP_NIK_INVALID',
      }),
    });
    await expect(
      service.lookupForDraft({
        identifierType: 'IHS',
        identifier: 'P/invalid',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_PATIENT_LOOKUP_IHS_INVALID',
      }),
    });
    expect(fhir.searchPatients).not.toHaveBeenCalled();
    expect(fhir.getPatient).not.toHaveBeenCalled();
  });

  it('returns an empty result when SATUSEHAT has no Patient match', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.searchPatients.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
      entry: [],
    });
    const service = createService(prisma, fhir);

    await expect(
      service.lookupForDraft({
        identifierType: 'NIK',
        identifier: localPatient.nik,
      }),
    ).resolves.toEqual({ items: [], total: 0 });
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.create).not.toHaveBeenCalled();
  });

  it('returns the remote lookup failure without creating a sync log', async () => {
    const prisma = createPrismaMock();
    const fhir = createFhirMock();
    fhir.getPatient.mockRejectedValue(
      new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        'Patient SATUSEHAT tidak ditemukan',
        404,
      ),
    );
    const service = createService(prisma, fhir);

    await expect(
      service.lookupForDraft({
        identifierType: 'IHS',
        identifier: 'P02478375538',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
      }),
    });
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.create).not.toHaveBeenCalled();
  });

  it('creates an unlinked local Patient remotely and persists the linkage and audit log', async () => {
    const prisma = createPrismaMock();
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-create-1' });
    const fhir = createFhirMock();
    fhir.createPatient.mockResolvedValue({
      resourceType: 'Patient',
      id: 'P10000001',
    });
    const service = createService(prisma, fhir);

    await expect(service.syncPatient(localPatient.id)).resolves.toEqual(
      expect.objectContaining({
        operation: 'CREATE',
        externalResourceId: 'P10000001',
        syncedRemotely: true,
        syncLogId: 'sync-create-1',
      }),
    );
    expect(fhir.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Patient',
        identifier: [
          expect.objectContaining({
            system: 'https://fhir.kemkes.go.id/id/nik',
            value: localPatient.nik,
          }),
        ],
      }),
    );
    expect(fhir.patchPatient).not.toHaveBeenCalled();
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resourceType: 'Patient',
          localResourceType: 'Patient',
          localResourceId: localPatient.id,
          externalResourceId: 'P10000001',
        }),
      }),
    );
    expect(prisma.satusehatSyncLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resourceType: 'Patient',
          resourceId: localPatient.id,
          status: 'PENDING',
        }),
      }),
    );
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sync-create-1' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          satusehatId: 'P10000001',
        }),
      }),
    );
  });

  it('uses PATCH for a repeat sync when a persisted linkage exists', async () => {
    const prisma = createPrismaMock();
    prisma.externalResourceLink.findUnique.mockResolvedValue({
      externalResourceId: 'P10000001',
      localResourceId: localPatient.id,
    });
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-update-1' });
    const fhir = createFhirMock();
    fhir.patchPatient.mockResolvedValue({
      resourceType: 'Patient',
      id: 'P10000001',
    });
    const service = createService(prisma, fhir);

    await expect(service.syncPatient(localPatient.id)).resolves.toEqual(
      expect.objectContaining({
        operation: 'UPDATE',
        externalResourceId: 'P10000001',
        syncedRemotely: true,
      }),
    );
    expect(fhir.patchPatient).toHaveBeenCalledWith(
      'P10000001',
      expect.arrayContaining([
        expect.objectContaining({ op: 'replace', path: '/identifier' }),
      ]),
    );
    expect(fhir.createPatient).not.toHaveBeenCalled();
  });

  it('records remote failure without deleting an existing successful linkage', async () => {
    const prisma = createPrismaMock();
    prisma.externalResourceLink.findUnique.mockResolvedValue({
      externalResourceId: 'P10000001',
      localResourceId: localPatient.id,
    });
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-failed-1' });
    const fhir = createFhirMock();
    fhir.patchPatient.mockRejectedValue(
      new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        'Remote Patient menolak perubahan',
        422,
      ),
    );
    const service = createService(prisma, fhir);

    await expect(service.syncPatient(localPatient.id)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_FHIR_REQUEST_FAILED',
      }),
    });
    expect(prisma.externalResourceLink.upsert).not.toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sync-failed-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Remote Patient menolak perubahan',
        }),
      }),
    );
  });

  it('links a selected remote Patient only after verifying the remote resource', async () => {
    const prisma = createPrismaMock();
    prisma.satusehatSyncLog.create.mockResolvedValue({ id: 'sync-link-1' });
    const fhir = createFhirMock();
    fhir.getPatient.mockResolvedValue({
      resourceType: 'Patient',
      id: 'P10000001',
      name: [{ text: 'Siti Sehat' }],
      identifier: [
        {
          system: 'https://fhir.kemkes.go.id/id/ihs-number',
          value: 'P10000001',
        },
      ],
    });
    const service = createService(prisma, fhir);

    await expect(
      service.linkExisting(localPatient.id, {
        externalResourceId: 'P10000001',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'LINK_EXISTING',
        externalResourceId: 'P10000001',
      }),
    );
    expect(fhir.getPatient).toHaveBeenCalledWith('P10000001');
    expect(prisma.externalResourceLink.upsert).toHaveBeenCalled();
    expect(prisma.satusehatSyncLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SUCCESS',
          satusehatId: 'P10000001',
        }),
      }),
    );
  });
});

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  fhir: ReturnType<typeof createFhirMock>,
) {
  const patients = {
    getPatientForExternalIntegration: jest.fn().mockResolvedValue(localPatient),
    findByIdOrThrow: jest.fn().mockResolvedValue(localPatient),
  };
  return new SatusehatPatientService(
    prisma as unknown as PrismaService,
    fhir as unknown as SatusehatFhirClient,
    patients as unknown as PatientsService,
  );
}

function createPrismaMock() {
  return {
    externalResourceLink: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    satusehatSyncLog: {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function createFhirMock() {
  return {
    searchPatients: jest.fn(),
    getPatient: jest.fn(),
    createPatient: jest.fn(),
    patchPatient: jest.fn(),
  };
}
