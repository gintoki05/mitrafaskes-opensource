import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EncounterStatus,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
  OUTPATIENT_GENERAL_VALIDATION_PROFILE,
  type Encounter,
  type MedicalRecord,
  type ResourceIntegrationSummary,
} from '@mitrafaskes/shared';
import { resolveRmeSatusehatCompletion } from './rme-satusehat-completion-model.ts';

const connected = (remoteStatus?: string): ResourceIntegrationSummary[] => [
  {
    provider: 'SATUSEHAT',
    environment: 'sandbox',
    linkage: { externalResourceId: 'remote-1', remoteStatus },
  },
];

function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: 'enc-1',
    encounterNumber: 'ENC-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    organizationId: 'org-1',
    locationId: 'location-1',
    queueDate: '2026-08-19',
    queueNumber: 1,
    status: EncounterStatus.IN_PROGRESS,
    arrivedAt: '2026-08-19T01:00:00.000Z',
    startedAt: '2026-08-19T01:05:00.000Z',
    version: 2,
    statusHistory: [],
    integrations: [],
    createdAt: '2026-08-19T01:00:00.000Z',
    updatedAt: '2026-08-19T01:05:00.000Z',
    ...overrides,
  };
}

function record(overrides: Partial<MedicalRecord> = {}): MedicalRecord {
  return {
    id: 'rme-1',
    encounterId: 'enc-1',
    status: MedicalRecordStatus.DRAFT,
    version: 1,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    validationProfile: OUTPATIENT_GENERAL_VALIDATION_PROFILE,
    histories: [],
    observations: [],
    diagnoses: [],
    prescriptions: [],
    createdAt: '2026-08-19T01:05:00.000Z',
    updatedAt: '2026-08-19T01:05:00.000Z',
    ...overrides,
  };
}

test('completion flow starts with Encounter and names downstream dependencies', () => {
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter(),
    record: record(),
    canSync: true,
  });

  assert.equal(model.initialEncounter.state, 'ready');
  assert.equal(model.diagnosis.state, 'empty');
  assert.equal(model.observation.state, 'empty');
  assert.equal(
    model.finalEncounter.disabledReason,
    'Finalisasi RME lokal sebelum memperbarui Encounter menjadi finished.',
  );
});

test('final Encounter is blocked until the primary Condition is linked', () => {
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter({
      status: EncounterStatus.COMPLETED,
      integrations: connected('in-progress'),
    }),
    record: record({
      status: MedicalRecordStatus.FINAL,
      diagnoses: [
        {
          id: 'diagnosis-1',
          icd10Code: 'J00',
          isPrimary: true,
          integrations: [],
        },
      ],
    }),
    canSync: true,
  });

  assert.equal(model.finalEncounter.state, 'blocked');
  assert.equal(
    model.finalEncounter.disabledReason,
    'Sinkronkan diagnosis utama Condition terlebih dahulu.',
  );
});

test('a final local RME can recover a missed initial Encounter through primary Condition sync', () => {
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter({
      status: EncounterStatus.COMPLETED,
      completedAt: '2026-08-19T02:00:00.000Z',
      integrations: [],
    }),
    record: record({
      status: MedicalRecordStatus.FINAL,
      diagnoses: [
        {
          id: 'diagnosis-1',
          icd10Code: 'J00',
          isPrimary: true,
          integrations: [],
        },
      ],
    }),
    canSync: true,
  });

  assert.equal(model.encounterRecoveryAvailable, true);
  assert.equal(model.diagnosis.state, 'ready');
  assert.match(
    model.finalEncounter.disabledReason ?? '',
    /memulihkan Encounter/,
  );
});

test('linked primary diagnosis makes the finished update ready', () => {
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter({
      status: EncounterStatus.COMPLETED,
      integrations: connected('in-progress'),
    }),
    record: record({
      status: MedicalRecordStatus.FINAL,
      diagnoses: [
        {
          id: 'diagnosis-1',
          icd10Code: 'J00',
          isPrimary: true,
          integrations: connected(),
        },
      ],
    }),
    canSync: true,
  });

  assert.equal(model.finalEncounter.state, 'ready');
  assert.equal(model.completedStepCount, 2);
});

test('finished linkage remains complete while a latest retry failure stays discoverable', () => {
  const encounterIntegrations = connected('finished');
  encounterIntegrations[0]!.latestSync = {
    status: 'FAILED',
    errorMessage: 'Remote update gagal.',
    updatedAt: '2026-08-19T02:00:00.000Z',
  };
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter({
      status: EncounterStatus.COMPLETED,
      integrations: encounterIntegrations,
    }),
    record: record({ status: MedicalRecordStatus.FINAL }),
    canSync: true,
  });

  assert.equal(model.encounterFinishedRemotely, true);
  assert.equal(model.finalEncounter.state, 'complete');
});

test('pending local edits disable resource sync even when prerequisites are linked', () => {
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter({ integrations: connected('in-progress') }),
    record: record({
      diagnoses: [
        {
          id: 'diagnosis-1',
          icd10Code: 'J00',
          isPrimary: true,
          integrations: [],
        },
      ],
    }),
    canSync: true,
    localChangesPending: true,
  });

  assert.equal(model.diagnosis.state, 'blocked');
  assert.equal(
    model.diagnosis.disabledReason,
    'Simpan perubahan lokal sebelum sinkronisasi.',
  );
});

test('Observation step stays ready until every saved item is linked', () => {
  const model = resolveRmeSatusehatCompletion({
    encounter: encounter({ integrations: connected('in-progress') }),
    record: record({
      observations: [
        {
          id: 'observation-1',
          category: 'vital-signs',
          code: { code: '8867-4' },
          value: { type: 'quantity', value: 76, unit: '/min' },
          effectiveAt: '2026-08-19T01:10:00.000Z',
          status: 'final',
          provenance: 'original',
          derivedFromObservationIds: [],
          integrations: connected(),
        },
        {
          id: 'observation-2',
          category: 'vital-signs',
          code: { code: '8310-5' },
          value: { type: 'quantity', value: 36.8, unit: 'Cel' },
          effectiveAt: '2026-08-19T01:10:00.000Z',
          status: 'final',
          provenance: 'original',
          derivedFromObservationIds: [],
          integrations: [],
        },
      ],
    }),
    canSync: true,
  });

  assert.equal(model.linkedObservationCount, 1);
  assert.equal(model.totalObservationCount, 2);
  assert.equal(model.observation.state, 'ready');
});
