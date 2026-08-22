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
  const fhirLifecycleMigration = readFileSync(
    resolve(
      __dirname,
      '../../../../packages/database/prisma/migrations/20260817120000_encounter_fhir_lifecycle/migration.sql',
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

  it('migrates Encounter status values to the canonical FHIR vocabulary', () => {
    expect(fhirLifecycleMigration).toContain(
      'ALTER TYPE "EncounterStatus" RENAME TO "EncounterStatus_old"',
    );
    expect(fhirLifecycleMigration).toContain("WHEN 'WAITING' THEN 'arrived'");
    expect(fhirLifecycleMigration).toContain(
      "WHEN 'COMPLETED' THEN 'finished'",
    );
    expect(fhirLifecycleMigration).toContain("'entered-in-error'");
    expect(fhirLifecycleMigration).toContain(
      "WHERE \"status\" IN ('arrived', 'triaged', 'in-progress', 'onleave')",
    );
  });

  it('creates the provider-neutral integration outbox with correction scope', () => {
    expect(fhirLifecycleMigration).toContain(
      'CREATE TABLE "IntegrationOutboxEvent"',
    );
    expect(fhirLifecycleMigration).toContain('IntegrationOutboxDispatchScope');
    expect(fhirLifecycleMigration).toContain("'LINKED_ONLY'");
    expect(fhirLifecycleMigration).toContain(
      'IntegrationOutboxEvent_resourceType_resourceId_aggregateVersion_operation_key',
    );
  });
});
