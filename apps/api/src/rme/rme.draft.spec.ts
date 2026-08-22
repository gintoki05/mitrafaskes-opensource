import { MedicalRecordStatus } from '@prisma/client';
import { EncounterStatus } from '@mitrafaskes/shared';
import type { PrismaService } from '../database/prisma.service';
import type { EncountersService } from '../encounters/encounters.service';
import { RmeService } from './rme.service';

const now = new Date('2026-08-13T03:00:00.000Z');
const actor = { id: 'doctor-1', username: 'dr_budi', role: 'DOKTER' as const };

function baseRecord() {
  return {
    id: 'rme-1',
    encounterId: 'encounter-1',
    status: MedicalRecordStatus.DRAFT,
    version: 1,
    authoredBy: 'dr_budi',
    authoredAt: now,
    finalizedBy: null,
    finalizedAt: null,
    serviceProfile: 'OUTPATIENT_GENERAL',
    validationProfile: 'OUTPATIENT_GENERAL_V1',
    chiefComplaint: null,
    presentIllness: null,
    allergyReviewStatus: null,
    allergyDetails: null,
    physicalExam: null,
    education: null,
    carePlan: null,
    disposition: null,
    anamnesis: null,
    systolic: null,
    diastolic: null,
    heartRate: null,
    temperature: null,
    weight: null,
    height: null,
    diagnoses: [],
    prescriptions: [],
    observations: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createHarness(transaction: Record<string, any>) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'doctor-1' }) },
    medicalRecord: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback(transaction),
    ),
  } as unknown as PrismaService;
  const encounters = {} as EncountersService;
  return new RmeService(prisma, encounters);
}

function lockedEncounter() {
  return {
    id: 'encounter-1',
    status: EncounterStatus.IN_PROGRESS,
    version: 2,
    doctorId: 'doctor-1',
    organizationId: 'organization-1',
    locationId: 'location-1',
  };
}

describe('RmeService draft persistence', () => {
  it('saves a draft without observations when the typed child delegate is available', async () => {
    const saved = baseRecord();
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([lockedEncounter()])
        .mockResolvedValueOnce([]),
      medicalRecord: {
        create: jest.fn().mockResolvedValue(saved),
        findUnique: jest.fn().mockResolvedValue(saved),
      },
      clinicalObservation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const service = createHarness(transaction);

    const result = await service.saveDraft(
      {
        encounterId: 'encounter-1',
        expectedVersion: 0,
        diagnoses: [],
        prescriptions: [],
      },
      actor,
    );

    expect(result.observations).toEqual([]);
    expect(transaction.clinicalObservation.findMany).toHaveBeenCalledWith({
      where: { medicalRecordId: 'rme-1' },
      select: { id: true, code: true },
    });
    expect(transaction.clinicalObservation.create).not.toHaveBeenCalled();
    expect(transaction.clinicalObservation.deleteMany).not.toHaveBeenCalled();
  });

  it('creates a typed quantity Observation with the actor, effective time, and UCUM unit', async () => {
    const effectiveAt = new Date('2026-08-13T03:15:00.000Z');
    const savedObservation = {
      id: 'observation-temperature-1',
      medicalRecordId: 'rme-1',
      category: 'vital-signs',
      codeSystem: 'http://loinc.org',
      code: '8310-5',
      codeDisplay: 'Body temperature',
      valueType: 'quantity',
      valueQuantityValue: 36.7,
      valueQuantityUnit: 'Cel',
      valueQuantitySystem: 'http://unitsofmeasure.org',
      valueQuantityCode: 'Cel',
      valueCodeSystem: null,
      valueCode: null,
      valueCodeDisplay: null,
      valueBoolean: null,
      valueString: null,
      effectiveAt,
      performerId: 'doctor-1',
      status: 'final',
      provenance: 'original',
      derivedFromObservationIds: [],
      referenceRangeLow: null,
      referenceRangeHigh: null,
      interpretationCode: null,
      interpretationDisplay: null,
      createdAt: now,
      updatedAt: now,
    };
    const saved = { ...baseRecord(), observations: [savedObservation] };
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([lockedEncounter()])
        .mockResolvedValueOnce([]),
      medicalRecord: {
        create: jest.fn().mockResolvedValue({
          ...saved,
          observations: [],
        }),
        findUnique: jest.fn().mockResolvedValue(saved),
      },
      clinicalObservation: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue(savedObservation),
        deleteMany: jest.fn(),
      },
    };
    const service = createHarness(transaction);

    const result = await service.saveDraft(
      {
        encounterId: 'encounter-1',
        expectedVersion: 0,
        observations: [
          {
            code: {
              system: 'http://loinc.org',
              code: '8310-5',
              display: 'Body temperature',
            },
            value: {
              type: 'quantity',
              value: 36.7,
              unit: 'Cel',
              system: 'http://unitsofmeasure.org',
              code: 'Cel',
            },
            effectiveAt: effectiveAt.toISOString(),
          },
        ],
        diagnoses: [],
        prescriptions: [],
      },
      actor,
    );

    expect(transaction.clinicalObservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.any(String),
        medicalRecordId: 'rme-1',
        category: 'vital-signs',
        codeSystem: 'http://loinc.org',
        code: '8310-5',
        valueType: 'quantity',
        valueQuantityValue: 36.7,
        valueQuantityUnit: 'Cel',
        valueQuantitySystem: 'http://unitsofmeasure.org',
        valueQuantityCode: 'Cel',
        effectiveAt,
        performerId: 'doctor-1',
      }),
    });
    expect(result.observations[0]).toEqual(
      expect.objectContaining({
        id: 'observation-temperature-1',
        effectiveAt: effectiveAt.toISOString(),
        performerId: 'doctor-1',
        value: expect.objectContaining({
          type: 'quantity',
          value: 36.7,
          unit: 'Cel',
          system: 'http://unitsofmeasure.org',
          code: 'Cel',
        }),
      }),
    );
  });
});
