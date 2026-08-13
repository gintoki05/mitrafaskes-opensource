import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EncounterStatus,
  Gender,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
  type Encounter,
  type MedicalRecord,
} from '@mitrafaskes/shared';
import { formValuesFrom } from './rme-form-mappers.ts';
import {
  buildRmeWorkspaceContext,
  isRmeReadOnly,
  resolveRmeWorkspaceViewState,
  versionConflictFrom,
} from './rme-workspace-model.ts';

function encounter(patient: Encounter['patient']): Encounter {
  return {
    id: 'encounter-1',
    encounterNumber: 'ENC-2026-000123',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    organizationId: 'organization-1',
    locationId: 'location-1',
    queueDate: '2026-08-13',
    queueNumber: 7,
    status: EncounterStatus.IN_PROGRESS,
    arrivedAt: '2026-08-13T01:00:00.000Z',
    startedAt: '2026-08-13T01:25:00.000Z',
    version: 2,
    statusHistory: [],
    createdAt: '2026-08-13T01:00:00.000Z',
    updatedAt: '2026-08-13T01:25:00.000Z',
    integrations: [],
    patient,
    doctor: { fullName: 'dr. Budi Santoso' },
    organization: { id: 'organization-1', code: 'ORG-1', name: 'Klinik Demo' },
    location: { id: 'location-1', code: 'POLI-UMUM', name: 'Poli Umum' },
  };
}

function record(
  status = MedicalRecordStatus.DRAFT,
  version = 1,
  anamnesis: string | undefined = 'Demam dua hari',
): MedicalRecord {
  return {
    id: 'rme-1',
    encounterId: 'encounter-1',
    status,
    version,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    validationProfile: 'OUTPATIENT_GENERAL_V1',
    anamnesis,
    diagnoses: [],
    prescriptions: [],
    createdAt: '2026-08-13T01:25:00.000Z',
    updatedAt: `2026-08-13T01:${25 + version}:00.000Z`,
  };
}

test('patient and encounter context stays complete and uses safe empty labels', () => {
  const complete = buildRmeWorkspaceContext(
    encounter({
      fullName: 'Siti Aminah',
      medicalRecNo: 'RM-2026-000009',
      nik: '3171000000000001',
      birthDate: '1990-04-23',
      gender: Gender.FEMALE,
      address: 'Jl. Merdeka 10',
    }),
    record(),
  );

  assert.equal(complete.patientName, 'Siti Aminah');
  assert.equal(complete.medicalRecordNumber, 'RM-2026-000009');
  assert.equal(complete.nik, '3171000000000001');
  assert.match(complete.birthDateAndAge, /36 tahun/);
  assert.equal(complete.gender, 'Perempuan');
  assert.equal(complete.encounterNumber, 'ENC-2026-000123');
  assert.equal(complete.location, 'Poli Umum');
  assert.equal(complete.doctor, 'dr. Budi Santoso');
  assert.equal(complete.queueNumber, '#7');
  assert.equal(complete.waitDuration, '25 menit');
  assert.equal(complete.serviceProfile, 'OUTPATIENT_GENERAL');
  assert.equal(complete.validationProfile, 'OUTPATIENT_GENERAL_V1');

  const missing = buildRmeWorkspaceContext(encounter(undefined), null);
  assert.equal(missing.patientName, 'Identitas pasien tidak tersedia');
  assert.equal(missing.nik, 'Belum tersedia');
  assert.equal(missing.birthDateAndAge, 'Belum tersedia');
  assert.equal(missing.address, 'Belum tersedia');
});

test('workspace state distinguishes loading, empty, error, and ready records', () => {
  assert.equal(resolveRmeWorkspaceViewState({
    encountersLoading: true,
    queueError: '',
    hasSelectedEncounter: false,
    recordLoading: false,
    recordError: '',
  }), 'loading-queue');
  assert.equal(resolveRmeWorkspaceViewState({
    encountersLoading: false,
    queueError: '',
    hasSelectedEncounter: false,
    recordLoading: false,
    recordError: '',
  }), 'empty');
  assert.equal(resolveRmeWorkspaceViewState({
    encountersLoading: false,
    queueError: 'Jaringan terputus',
    hasSelectedEncounter: false,
    recordLoading: false,
    recordError: '',
  }), 'queue-error');
  assert.equal(resolveRmeWorkspaceViewState({
    encountersLoading: false,
    queueError: '',
    hasSelectedEncounter: true,
    recordLoading: false,
    recordError: 'Draft gagal dimuat',
  }), 'record-error');
});

test('version conflict keeps the server version available for recovery UI', () => {
  assert.deepEqual(versionConflictFrom({
    code: 'RME_VERSION_CONFLICT',
    message: 'RME sudah berubah.',
    currentVersion: 4,
  }), {
    message: 'RME sudah berubah.',
    currentVersion: 4,
  });
  assert.equal(versionConflictFrom({ code: 'RME_VALIDATION_FAILED' }), null);
});

test('refresh snapshot resets the form to the latest persisted draft', () => {
  const emptyPersistedRecord = record(MedicalRecordStatus.DRAFT, 1);
  emptyPersistedRecord.anamnesis = undefined;
  const firstSnapshot = formValuesFrom(emptyPersistedRecord);
  const refreshedSnapshot = formValuesFrom(record(MedicalRecordStatus.DRAFT, 2, 'Keluhan terbaru'));

  assert.equal(firstSnapshot.anamnesis, '');
  assert.equal(firstSnapshot.systolic, '');
  assert.deepEqual(firstSnapshot.diagnoses, []);
  assert.equal(refreshedSnapshot.anamnesis, 'Keluhan terbaru');
  assert.notDeepEqual(refreshedSnapshot, firstSnapshot);
});

test('only a final record makes the workspace read-only', () => {
  assert.equal(isRmeReadOnly(null), false);
  assert.equal(isRmeReadOnly(record(MedicalRecordStatus.DRAFT)), false);
  assert.equal(isRmeReadOnly(record(MedicalRecordStatus.FINAL)), true);
});

test('preflight issues do not make the draft read-only or replace its local values', () => {
  const draft = record(MedicalRecordStatus.DRAFT, 3, 'Keluhan belum lengkap');
  const before = formValuesFrom(draft);
  const preflightIssues = [
    { section: 'plan', field: 'carePlan', message: 'Rencana wajib diisi.' },
  ];

  assert.equal(preflightIssues.length, 1);
  assert.equal(isRmeReadOnly(draft), false);
  assert.deepEqual(formValuesFrom(draft), before);
});
