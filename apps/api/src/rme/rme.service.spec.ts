import { MedicalRecordStatus } from '@prisma/client';
import type { PrismaService } from '../database/prisma.service';
import type { EncountersService } from '../encounters/encounters.service';
import type { MasterIcd10Service } from '../master-data/master-icd10.service';
import { RmeService } from './rme.service';
import { parseDraftInput } from './rme.validation';

const now = new Date('2026-08-13T03:00:00.000Z');
const actor = { id: 'doctor-1', username: 'dr_budi', role: 'DOKTER' as const };

function medicalRecord(
  status: MedicalRecordStatus = MedicalRecordStatus.DRAFT,
  version = 1,
) {
  return {
    id: 'rme-1',
    encounterId: 'encounter-1',
    status,
    version,
    authoredBy: 'dr_budi',
    authoredAt: now,
    finalizedBy: status === MedicalRecordStatus.FINAL ? 'dr_budi' : null,
    finalizedAt: status === MedicalRecordStatus.FINAL ? now : null,
    validationProfile: 'OUTPATIENT_GENERAL_V1',
    anamnesis: 'Demam sejak dua hari.',
    systolic: 120,
    diastolic: 80,
    heartRate: 78,
    temperature: 37.2,
    weight: null,
    height: null,
    diagnoses: [
      {
        id: 'diagnosis-1',
        medicalRecordId: 'rme-1',
        icd10Code: 'J00',
        isPrimary: true,
        satusehatConditionId: null,
        icd10: {
          code: 'J00',
          display: 'Acute nasopharyngitis',
          nameIndo: 'Nasofaringitis akut',
          nameEng: 'Acute nasopharyngitis',
          active: true,
          displayOrder: 1,
          source: 'WHO',
          sourceVersion: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    ],
    prescriptions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createService(transaction: Record<string, unknown>) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'doctor-1' }) },
    encounter: { findUnique: jest.fn().mockResolvedValue({ doctorId: 'doctor-1' }) },
    medicalRecord: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback(transaction),
    ),
  } as unknown as PrismaService;
  const icd10 = {
    findByCodes: jest.fn().mockResolvedValue([
      {
        code: 'J00',
        display: 'Acute nasopharyngitis',
        nameEng: 'Acute nasopharyngitis',
      },
    ]),
  } as unknown as MasterIcd10Service;
  const encounters = {
    saveRmeCompletion: jest.fn(),
  } as unknown as EncountersService;
  return {
    service: new RmeService(prisma, icd10, encounters),
    prisma,
    encounters,
  };
}

const completeDraft = {
  encounterId: 'encounter-1',
  expectedVersion: 0,
  anamnesis: 'Demam sejak dua hari.',
  systolic: 120,
  diastolic: 80,
  heartRate: 78,
  temperature: 37.2,
  diagnoses: [{ icd10Code: 'J00', isPrimary: true }],
  prescriptions: [],
};

describe('RmeService lifecycle', () => {
  it('saves a partial draft without completing the Encounter', async () => {
    const saved = {
      ...medicalRecord(),
      anamnesis: null,
      systolic: null,
      diastolic: null,
      heartRate: null,
      temperature: null,
      diagnoses: [],
    };
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          { id: 'encounter-1', status: 'IN_PROGRESS', version: 2, doctorId: 'doctor-1' },
        ])
        .mockResolvedValueOnce([]),
      medicalRecord: { create: jest.fn().mockResolvedValue(saved) },
    };
    const { service, encounters } = createService(transaction);

    const result = await service.saveDraft(
      {
        encounterId: 'encounter-1',
        expectedVersion: 0,
        diagnoses: [],
        prescriptions: [],
      },
      actor,
    );

    expect(result.status).toBe('DRAFT');
    expect(result.anamnesis).toBeUndefined();
    expect(encounters.saveRmeCompletion).not.toHaveBeenCalled();
  });

  it('finalizes the RME and completes the Encounter in the same transaction', async () => {
    const draft = {
      ...medicalRecord(),
      encounter: {
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        organizationId: 'organization-1',
        locationId: 'location-1',
      },
    };
    const finalized = medicalRecord(MedicalRecordStatus.FINAL, 2);
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          { id: 'encounter-1', status: 'IN_PROGRESS', version: 3, doctorId: 'doctor-1' },
        ])
        .mockResolvedValueOnce([
          { id: 'rme-1', status: MedicalRecordStatus.DRAFT, version: 1 },
        ]),
      medicalRecord: {
        findUnique: jest.fn().mockResolvedValue(draft),
        update: jest.fn().mockResolvedValue(finalized),
      },
    };
    const { service, prisma, encounters } = createService(transaction);

    const result = await service.finalize(
      { encounterId: 'encounter-1', expectedVersion: 1 },
      actor,
    );

    expect(result.status).toBe('FINAL');
    expect(result.version).toBe(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(encounters.saveRmeCompletion).toHaveBeenCalledWith(
      transaction,
      'encounter-1',
      3,
      actor,
    );
  });

  it('rejects draft writes to a final RME', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          { id: 'encounter-1', status: 'IN_PROGRESS', version: 2, doctorId: 'doctor-1' },
        ])
        .mockResolvedValueOnce([
          { id: 'rme-1', status: MedicalRecordStatus.FINAL, version: 2 },
        ]),
      medicalRecord: { update: jest.fn() },
    };
    const { service } = createService(transaction);

    await expect(
      service.saveDraft({ ...completeDraft, expectedVersion: 2 }, actor),
    ).rejects.toMatchObject({ response: { code: 'RME_FINAL_IMMUTABLE' } });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
  });

  it('rejects draft writes when the Encounter belongs to another doctor', async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValueOnce([
        {
          id: 'encounter-1',
          status: 'IN_PROGRESS',
          version: 1,
          doctorId: 'doctor-other',
        },
      ]),
      medicalRecord: { create: jest.fn(), update: jest.fn() },
    };
    const { service } = createService(transaction);

    await expect(
      service.saveDraft(
        {
          encounterId: 'encounter-1',
          expectedVersion: 0,
          diagnoses: [],
          prescriptions: [],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: 'ENCOUNTER_NOT_ASSIGNED_TO_DOCTOR' },
    });
    expect(transaction.medicalRecord.create).not.toHaveBeenCalled();
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
  });

  it('rejects a stale expectedVersion before mutating the draft', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          { id: 'encounter-1', status: 'IN_PROGRESS', version: 2, doctorId: 'doctor-1' },
        ])
        .mockResolvedValueOnce([
          { id: 'rme-1', status: MedicalRecordStatus.DRAFT, version: 4 },
        ]),
      medicalRecord: { update: jest.fn() },
    };
    const { service } = createService(transaction);

    await expect(
      service.saveDraft({ ...completeDraft, expectedVersion: 3 }, actor),
    ).rejects.toMatchObject({ response: { code: 'RME_VERSION_CONFLICT' } });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
  });

  it('keeps empty draft input free of invented clinical values', () => {
    const parsed = parseDraftInput({
      encounterId: 'encounter-1',
      expectedVersion: 0,
      diagnoses: [],
      prescriptions: [],
    });

    expect(parsed).toEqual(
      expect.objectContaining({
        anamnesis: undefined,
        systolic: undefined,
        diastolic: undefined,
        heartRate: undefined,
        temperature: undefined,
        diagnoses: [],
        prescriptions: [],
      }),
    );
  });
});
