import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../../../packages/database/prisma/migrations/20260813200000_observation_typed_child/migration.sql',
  ),
  'utf8',
);

describe('typed Observation child migration', () => {
  it('creates a provider-neutral typed child with stable IDs and derived fields', () => {
    expect(migration).toContain('CREATE TABLE "ClinicalObservation"');
    expect(migration).toContain('"valueType" VARCHAR(32) NOT NULL');
    expect(migration).toContain('"valueQuantityValue" DOUBLE PRECISION');
    expect(migration).toContain('"derivedFromObservationIds" TEXT[]');
    expect(migration).toContain('ClinicalObservation_medicalRecordId_fkey');
  });

  it('does not store provider credentials or call a remote provider', () => {
    expect(migration).not.toMatch(/access[_-]?token|secret|credential/i);
    expect(migration).not.toMatch(/fetch\s*\(/i);
  });
});
