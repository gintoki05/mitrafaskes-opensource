import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyRmeFormValues } from './rme-form-schema.ts';

test('RME form starts without invented clinical data', () => {
  assert.deepEqual(emptyRmeFormValues(), {
    anamnesis: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    temperature: '',
    diagnoses: [],
    prescriptions: [],
  });
});
