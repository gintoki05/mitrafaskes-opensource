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
  assert.match(source, /validationProfile:\s*string/);
  assert.match(source, /authoredBy\?:\s*string/);
  assert.match(source, /finalizedBy\?:\s*string/);
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
});
