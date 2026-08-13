import { MedicalRecordStatus } from '@prisma/client';
import type { PrismaService } from '../database/prisma.service';
import type { EncountersService } from '../encounters/encounters.service';
import { RmeService } from './rme.service';
import { parseDraftInput } from './rme.validation';

const now = new Date('2026-08-13T03:00:00.000Z');
const actor = { id: 'doctor-1', username: 'dr_budi', role: 'DOKTER' as const };
const request = { requestId: 'request-123', correlationId: 'correlation-123' };
const finalizeCommand = {
  encounterId: 'encounter-1',
  expectedVersion: 1,
  idempotencyKey: 'finalize-request-123',
};

function medicalRecord(status: MedicalRecordStatus = MedicalRecordStatus.DRAFT, version = 1) {
  return {
    id: 'rme-1',
    encounterId: 'encounter-1',
    status,
    version,
    authoredBy: 'dr_budi',
    authoredAt: now,
    finalizedBy: status === MedicalRecordStatus.FINAL ? 'dr_budi' : null,
    finalizedAt: status === MedicalRecordStatus.FINAL ? now : null,
    serviceProfile: 'OUTPATIENT_GENERAL',
    validationProfile: 'OUTPATIENT_GENERAL_V1',
    chiefComplaint: 'Demam',
    presentIllness: 'Demam sejak dua hari.',
    allergyReviewStatus: 'NONE_KNOWN',
    allergyDetails: null,
    physicalExam: 'Keadaan umum baik.',
    education: 'Cukup minum dan istirahat.',
    carePlan: 'Terapi simptomatik dan kontrol bila memburuk.',
    disposition: 'HOME',
    anamnesis: null,
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

function finalizationDraft() {
  return {
    ...medicalRecord(),
    encounter: {
      id: 'encounter-1',
      status: 'IN_PROGRESS',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      organizationId: 'organization-1',
      locationId: 'location-1',
      doctor: {
        active: true,
        role: 'DOKTER',
        organizationId: 'organization-1',
        locationId: null,
        locationAssignments: [{ locationId: 'location-1' }],
      },
    },
  };
}

function createHarness(transaction: Record<string, any>, completion = jest.fn().mockResolvedValue({})) {
  const state = { committed: false };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'doctor-1' }) },
    encounter: {
      findUnique: jest.fn().mockResolvedValue({ doctorId: 'doctor-1' }),
    },
    medicalRecord: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => {
      try {
        const result = await callback(transaction);
        state.committed = true;
        return result;
      } catch (error) {
        state.committed = false;
        throw error;
      }
    }),
  } as unknown as PrismaService;
  const encounters = {
    saveRmeCompletion: completion,
  } as unknown as EncountersService;
  return {
    service: new RmeService(prisma, encounters),
    prisma,
    completion,
    state,
  };
}

function successfulTransaction() {
  return {
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{
        id: 'encounter-1',
        status: 'IN_PROGRESS',
        version: 3,
        doctorId: 'doctor-1',
        organizationId: 'organization-1',
        locationId: 'location-1',
        },
      ])
      .mockResolvedValueOnce([{
        id: 'rme-1',
        status: MedicalRecordStatus.DRAFT,
        version: 1,
        },
      ]),
    medicalRecord: {
      findUnique: jest.fn().mockResolvedValue(finalizationDraft()),
      update: jest.fn().mockResolvedValue(medicalRecord(MedicalRecordStatus.FINAL, 2)),
    },
    medicalRecordAuditEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };
}

describe('RmeService lifecycle', () => {
  it('saves a partial draft without completing the Encounter', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{
          id: 'encounter-1', status: 'IN_PROGRESS', version: 2,
          doctorId: 'doctor-1', organizationId: 'organization-1', locationId: 'location-1',
          },
        ])
        .mockResolvedValueOnce([]),
      medicalRecord: {
        create: jest.fn().mockResolvedValue({
          ...medicalRecord(),
          chiefComplaint: null,
          presentIllness: null,
          allergyReviewStatus: null,
          allergyDetails: null,
          physicalExam: null,
          education: null,
          carePlan: null,
          disposition: null,
          diagnoses: [],
        }),
      },
    };
    const { service, completion } = createHarness(transaction);

    const result = await service.saveDraft({
      encounterId: 'encounter-1', expectedVersion: 0, diagnoses: [], prescriptions: [],
      },
      actor,
    );

    expect(result.status).toBe('DRAFT');
    expect(result.chiefComplaint).toBeUndefined();
    expect(completion).not.toHaveBeenCalled();
  });

  it('stores an unmapped local diagnosis without requiring the terminology catalog', async () => {
    const saved = {
      ...medicalRecord(),
      diagnoses: [
        {
          ...medicalRecord().diagnoses[0],
          icd10Code: 'X99.9',
          icd10: null,
        },
      ],
    };
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'encounter-1',
            status: 'IN_PROGRESS',
            version: 2,
            doctorId: 'doctor-1',
            organizationId: 'organization-1',
            locationId: 'location-1',
          },
        ])
        .mockResolvedValueOnce([]),
      medicalRecord: {
        create: jest.fn().mockResolvedValue(saved),
      },
    };
    const { service, prisma } = createHarness(transaction);

    const result = await service.saveDraft(
      {
        encounterId: 'encounter-1',
        expectedVersion: 0,
        diagnoses: [{ icd10Code: 'X99.9', isPrimary: true }],
        prescriptions: [],
      },
      actor,
    );

    expect(transaction.medicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          diagnoses: { create: [{ icd10Code: 'X99.9', isPrimary: true }] },
        }),
      }),
    );
    expect(prisma.masterIcd10).toBeUndefined();
    expect(result.diagnoses[0]?.icd10Code).toBe('X99.9');
  });

  it('keeps a draft editable after preflight reports section issues', async () => {
    const incomplete = {
      ...finalizationDraft(),
      chiefComplaint: null,
      presentIllness: null,
      allergyReviewStatus: null,
      allergyDetails: null,
      physicalExam: null,
      education: null,
      carePlan: null,
      disposition: null,
      diagnoses: [],
    };
    const saved = {
      ...medicalRecord(),
      chiefComplaint: 'Batuk',
      diagnoses: [],
    };
    const encounterLock = {
      id: 'encounter-1', status: 'IN_PROGRESS', version: 3,
      doctorId: 'doctor-1', organizationId: 'organization-1', locationId: 'location-1',
    };
    const draftLock = {
      id: 'rme-1', status: MedicalRecordStatus.DRAFT, version: 1,
    };
    const transaction = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([encounterLock])
        .mockResolvedValueOnce([draftLock])
        .mockResolvedValueOnce([encounterLock])
        .mockResolvedValueOnce([draftLock]),
      medicalRecord: {
        findUnique: jest.fn().mockResolvedValue(incomplete),
        update: jest.fn().mockResolvedValue(saved),
      },
    };
    const { service, completion } = createHarness(transaction);

    const preflight = await service.preflight({
      encounterId: 'encounter-1', expectedVersion: 1,
      },
      actor,
    );
    expect(preflight.ready).toBe(false);
    expect(preflight.issues).toEqual(expect.arrayContaining([expect.objectContaining({ section: 'anamnesis' })]));

    await expect(service.saveDraft({
      encounterId: 'encounter-1', expectedVersion: 1,
      chiefComplaint: 'Batuk', diagnoses: [], prescriptions: [],
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: 'DRAFT', chiefComplaint: 'Batuk' });
    expect(transaction.medicalRecord.update).toHaveBeenCalledTimes(1);
    expect(completion).not.toHaveBeenCalled();
  });

  it('keeps a final RME immutable through the draft endpoint', async () => {
    const transaction = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{
          id: 'encounter-1', status: 'IN_PROGRESS', version: 3,
          doctorId: 'doctor-1', organizationId: 'organization-1', locationId: 'location-1',
          },
        ])
        .mockResolvedValueOnce([{
          id: 'rme-1', status: MedicalRecordStatus.FINAL, version: 2,
          },
        ]),
      medicalRecord: { update: jest.fn() },
    };
    const { service } = createHarness(transaction);

    await expect(service.saveDraft({
      encounterId: 'encounter-1', expectedVersion: 2,
      diagnoses: [], prescriptions: [],
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: 'RME_FINAL_IMMUTABLE' },
    });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
  });

  it('finalizes RME, Encounter/history, and non-clinical audit atomically', async () => {
    const transaction = successfulTransaction();
    const { service, prisma, completion, state } = createHarness(transaction);

    const result = await service.finalize(finalizeCommand, actor, request);

    expect(result).toMatchObject({ status: 'FINAL', version: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(completion).toHaveBeenCalledWith(transaction, 'encounter-1', 3, actor);
    expect(transaction.medicalRecordAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'doctor-1',
        actorUsername: 'dr_budi',
        action: 'RME_FINALIZED',
        entityId: 'rme-1',
        entityVersion: 2,
        expectedVersion: 1,
        requestId: 'request-123',
        correlationId: 'correlation-123',
        idempotencyKey: 'finalize-request-123',
      }),
    });
    expect(transaction.medicalRecordAuditEvent.create.mock.calls[0][0].data).not.toHaveProperty('clinicalPayload');
    expect(state.committed).toBe(true);
  });

  it('returns the same final result for an exact idempotent retry', async () => {
    const final = medicalRecord(MedicalRecordStatus.FINAL, 2);
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{
          id: 'encounter-1', status: 'COMPLETED', version: 4,
          doctorId: 'doctor-1', organizationId: 'organization-1', locationId: 'location-1',
          },
        ])
        .mockResolvedValueOnce([{
          id: 'rme-1', status: MedicalRecordStatus.FINAL, version: 2,
          },
        ]),
      medicalRecord: {
        findUnique: jest.fn().mockResolvedValue(final),
        update: jest.fn(),
      },
      medicalRecordAuditEvent: {
        findUnique: jest.fn().mockResolvedValue({
          medicalRecordId: 'rme-1', expectedVersion: 1,
          entityVersion: 2, action: 'RME_FINALIZED',
        }),
        create: jest.fn(),
      },
    };
    const { service, completion } = createHarness(transaction);

    await expect(service.finalize(finalizeCommand, actor, request)).resolves.toMatchObject({
      status: 'FINAL',
      version: 2,
    });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
    expect(transaction.medicalRecordAuditEvent.create).not.toHaveBeenCalled();
    expect(completion).not.toHaveBeenCalled();
  });

  it('rejects a different request after the RME is already final', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{
          id: 'encounter-1', status: 'COMPLETED', version: 4,
          doctorId: 'doctor-1', organizationId: 'organization-1', locationId: 'location-1',
          },
        ])
        .mockResolvedValueOnce([{
          id: 'rme-1', status: MedicalRecordStatus.FINAL, version: 2,
          },
        ]),
      medicalRecord: { findUnique: jest.fn(), update: jest.fn() },
      medicalRecordAuditEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const { service, completion } = createHarness(transaction);

    await expect(service.finalize({
      ...finalizeCommand,
      idempotencyKey: 'different-request-456',
        },
        actor,
        request,
      ),
    ).rejects.toMatchObject({
      response: { code: 'RME_ALREADY_FINAL', currentVersion: 2 },
    });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
    expect(transaction.medicalRecordAuditEvent.create).not.toHaveBeenCalled();
    expect(completion).not.toHaveBeenCalled();
  });

  it('rejects a stale version before any finalization mutation', async () => {
    const transaction = successfulTransaction();
    transaction.$queryRaw.mockReset()
      .mockResolvedValueOnce([{
        id: 'encounter-1', status: 'IN_PROGRESS', version: 3,
        doctorId: 'doctor-1', organizationId: 'organization-1', locationId: 'location-1',
        },
      ])
      .mockResolvedValueOnce([{
        id: 'rme-1', status: MedicalRecordStatus.DRAFT, version: 4,
        },
      ]);
    const { service } = createHarness(transaction);

    await expect(service.finalize(finalizeCommand, actor, request)).rejects.toMatchObject({
      response: { code: 'RME_VERSION_CONFLICT' },
    });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
  });

  it('rejects a doctor who does not own the Encounter', async () => {
    const transaction = successfulTransaction();
    transaction.$queryRaw.mockReset().mockResolvedValueOnce([{
      id: 'encounter-1', status: 'IN_PROGRESS', version: 3,
      doctorId: 'doctor-other', organizationId: 'organization-1', locationId: 'location-1',
      },
    ]);
    const { service } = createHarness(transaction);

    await expect(service.finalize(finalizeCommand, actor, request)).rejects.toMatchObject({
      response: { code: 'ENCOUNTER_NOT_ASSIGNED_TO_DOCTOR' },
    });
    expect(transaction.medicalRecord.update).not.toHaveBeenCalled();
  });

  it.each([
    ['Encounter update', new Error('encounter update failed'), false],
    ['status history', new Error('status history failed'), false],
    ['audit insert', new Error('audit insert failed'), true],
  ])('rolls back all finalization writes when %s fails', async (_label, failure, failAudit) => {
    const transaction = successfulTransaction();
    const completion = failAudit ? jest.fn().mockResolvedValue({}) : jest.fn().mockRejectedValue(failure);
    if (failAudit) {
      transaction.medicalRecordAuditEvent.create.mockRejectedValue(failure);
    }
    const { service, state } = createHarness(transaction, completion);

    await expect(service.finalize(finalizeCommand, actor, request)).rejects.toBe(failure);
    expect(state.committed).toBe(false);
    expect(transaction.medicalRecord.update).toHaveBeenCalled();
    if (failAudit) expect(completion).toHaveBeenCalled();
  });

  it('keeps empty draft input free of invented clinical values', () => {
    const parsed = parseDraftInput({
      encounterId: 'encounter-1', expectedVersion: 0, diagnoses: [], prescriptions: [],
    });
    expect(parsed).toEqual(expect.objectContaining({
      serviceProfile: 'OUTPATIENT_GENERAL',
      validationProfile: 'OUTPATIENT_GENERAL_V1',
      chiefComplaint: undefined,
      presentIllness: undefined,
      allergyReviewStatus: undefined,
      diagnoses: [],
      prescriptions: [],
      }),
    );
  });

  it('preserves a diagnosis child id when an existing draft is edited', async () => {
    const existingDiagnosis = medicalRecord().diagnoses[0];
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'encounter-1',
            status: 'IN_PROGRESS',
            version: 1,
            doctorId: 'doctor-1',
            organizationId: 'organization-1',
            locationId: 'location-1',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'rme-1',
            status: MedicalRecordStatus.DRAFT,
            version: 1,
          },
        ]),
      medicalRecord: {
        update: jest.fn().mockResolvedValue(medicalRecord()),
        findUnique: jest.fn().mockResolvedValue(medicalRecord()),
      },
      diagnosis: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: existingDiagnosis.id,
            icd10Code: existingDiagnosis.icd10Code,
          },
        ]),
        update: jest.fn().mockResolvedValue(existingDiagnosis),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const { service } = createHarness(transaction);

    const result = await service.saveDraft(
      {
        encounterId: 'encounter-1',
        expectedVersion: 1,
        diagnoses: [{ id: existingDiagnosis.id, icd10Code: 'J00', isPrimary: true }],
        prescriptions: [],
      },
      actor,
    );

    expect(transaction.diagnosis.update).toHaveBeenCalledWith({
      where: { id: existingDiagnosis.id },
      data: { icd10Code: 'J00', isPrimary: true },
    });
    expect(transaction.diagnosis.create).not.toHaveBeenCalled();
    expect(transaction.diagnosis.deleteMany).not.toHaveBeenCalled();
    expect(result.diagnoses[0]?.id).toBe(existingDiagnosis.id);
  });
});
