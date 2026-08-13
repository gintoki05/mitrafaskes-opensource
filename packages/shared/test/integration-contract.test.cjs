const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const sourceRoot = resolve(__dirname, '../src');

test('core shared resource contracts expose generic integration summaries only', () => {
  for (const file of ['patient.ts', 'encounter.ts', 'master-data.ts']) {
    const source = readFileSync(resolve(sourceRoot, 'types', file), 'utf8');
    assert.match(source, /integrations:\s*ResourceIntegrationSummary\[\]/, file);
    assert.doesNotMatch(source, /\bsatusehat(?:Sync|Id)?\b/i, file);
  }
});

test('RME shared contracts do not contain provider-specific fields', () => {
  const source = readFileSync(resolve(sourceRoot, 'types', 'rme.ts'), 'utf8');
  assert.doesNotMatch(source, /\bsatusehat(?:Sync|Id)?\b/i);
});

test('generic integration contracts include capability and linkage types', () => {
  const source = readFileSync(resolve(sourceRoot, 'types', 'integrations.ts'), 'utf8');
  assert.match(source, /export interface IntegrationCapability/);
  assert.match(source, /export interface ResourceIntegrationSummary/);
  assert.match(source, /export interface IntegrationLog/);
});

test('shared SATUSEHAT contracts exclude provider-owned logs', () => {
  const source = readFileSync(resolve(sourceRoot, 'types', 'satusehat.ts'), 'utf8');
  assert.doesNotMatch(source, /SatusehatSyncLog/);
});
