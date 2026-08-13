const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(__dirname, '../src/types/rme.ts'),
  'utf8',
);

test('RME contract exposes draft/final lifecycle and version metadata', () => {
  assert.match(source, /enum MedicalRecordStatus[\s\S]*DRAFT[\s\S]*FINAL/);
  assert.match(source, /status:\s*MedicalRecordStatus/);
  assert.match(source, /version:\s*number/);
  assert.match(source, /serviceProfile:\s*MedicalRecordServiceProfile/);
  assert.match(source, /validationProfile:\s*MedicalRecordValidationProfile/);
  assert.match(source, /authoredBy\?:\s*string/);
  assert.match(source, /finalizedBy\?:\s*string/);
});

test('service profile maps explicitly to a versioned validation profile', () => {
  assert.match(source, /OUTPATIENT_GENERAL = 'OUTPATIENT_GENERAL'/);
  assert.match(
    source,
    /\[MedicalRecordServiceProfile\.OUTPATIENT_GENERAL\]:[\s\S]*OUTPATIENT_GENERAL_VALIDATION_PROFILE/,
  );
});

test('draft and finalize commands both require expectedVersion', () => {
  assert.match(
    source,
    /interface SaveMedicalRecordDraftDto[\s\S]*expectedVersion:\s*number/,
  );
  assert.match(
    source,
    /interface FinalizeMedicalRecordDto[\s\S]*expectedVersion:\s*number/,
  );
  assert.match(
    source,
    /interface FinalizeMedicalRecordDto[\s\S]*idempotencyKey:\s*string/,
  );
});

test('preflight exposes actionable issues grouped by RME section', () => {
  assert.match(source, /interface RmeValidationIssue[\s\S]*section:\s*RmeValidationSection/);
  assert.match(source, /interface RmePreflightResult[\s\S]*issues:\s*RmeValidationIssue\[\]/);
  assert.match(source, /interface PreflightMedicalRecordDto[\s\S]*expectedVersion:\s*number/);
});
