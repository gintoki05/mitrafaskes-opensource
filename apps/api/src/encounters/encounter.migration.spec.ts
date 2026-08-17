import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PRI-14 Encounter migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../../../packages/database/prisma/migrations/20260810100000_encounter_lifecycle/migration.sql',
    ),
    'utf8',
  );

  it('fails explicitly instead of guessing legacy Encounter context', () => {
    expect(migration).toContain('requires an explicit Encounter backfill');
    expect(migration).toMatch(/IF EXISTS \(SELECT 1 FROM "Encounter"\)/i);
  });

  it('defines the global Encounter sequence and stable uniqueness constraints', () => {
    expect(migration).toContain('CREATE SEQUENCE "encounter_number_seq"');
    expect(migration).toContain('Encounter_encounterNumber_key');
    expect(migration).toContain(
      'Encounter_locationId_queueDate_queueNumber_key',
    );
    expect(migration).toContain('Encounter_active_patient_context_key');
    expect(migration).toContain(
      "WHERE \"status\" IN ('WAITING', 'IN_PROGRESS')",
    );
  });

  it('creates status history and queue counter persistence tables', () => {
    expect(migration).toContain('CREATE TABLE "EncounterStatusHistory"');
    expect(migration).toContain('CREATE TABLE "EncounterQueueCounter"');
    expect(migration).toContain('actorUsername');
    expect(migration).toContain('actorRole');
    expect(migration).toContain(
      'EncounterQueueCounter_locationId_queueDate_key',
    );
  });

  it('contains no remote SATUSEHAT request', () => {
    expect(migration).not.toMatch(/https?:\/\//i);
    expect(migration).not.toMatch(/fetch\s*\(/i);
  });
});
