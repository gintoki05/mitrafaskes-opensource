import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AllergyReviewStatus,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
} from '@mitrafaskes/shared';
import { triageValuesFrom } from './triage-types.ts';

test('triage form starts empty when no local record exists', () => {
  const values = triageValuesFrom(null);

  assert.equal(values.chiefComplaint, '');
  assert.equal(values.allergyReviewStatus, '');
  assert.equal(values.systolic, '');
  assert.deepEqual(values.histories, []);
});

test('triage form restores legacy vitals and typed additional observations', () => {
  const values = triageValuesFrom({
    id: 'rme-1',
    encounterId: 'encounter-1',
    status: MedicalRecordStatus.DRAFT,
    version: 2,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    validationProfile: 'OUTPATIENT_GENERAL_V1',
    triageStatus: 'DRAFT',
    chiefComplaint: 'Demam',
    allergyReviewStatus: AllergyReviewStatus.NONE_KNOWN,
    allergyDetails: undefined,
    histories: [],
    observations: [
      {
        id: 'observation-1',
        category: 'vital-signs',
        code: { system: 'http://loinc.org', code: '9279-1' },
        value: { type: 'quantity', value: 20, unit: '/min' },
        effectiveAt: '2026-08-15T00:00:00.000Z',
        status: 'final',
        provenance: 'original',
        derivedFromObservationIds: [],
        integrations: [],
      },
    ],
    diagnoses: [],
    prescriptions: [],
    systolic: 120,
    diastolic: 80,
    heartRate: 78,
    temperature: 37.2,
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
  });

  assert.equal(values.chiefComplaint, 'Demam');
  assert.equal(values.allergyReviewStatus, 'NONE_KNOWN');
  assert.equal(values.systolic, '120');
  assert.equal(values.temperature, '37.2');
  assert.equal(values.respiratoryRate, '20');
});
