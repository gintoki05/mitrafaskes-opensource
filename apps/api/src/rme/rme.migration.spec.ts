import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(
    __dirname,
    '../../../../packages/database/prisma/migrations/20260813190000_rme_safe_finalization/migration.sql',
  ),
  'utf8',
);

describe('RME safe finalization migration', () => {
  it('adds only the minimum local finalization fields and provider-neutral audit', () => {
    expect(migration).toContain('"allergyReviewStatus"');
    expect(migration).toContain('"disposition"');
    expect(migration).toContain('CREATE TABLE "MedicalRecordAuditEvent"');
    expect(migration).toContain('"idempotencyKey" VARCHAR(128) NOT NULL');
    expect(migration).toContain('"correlationId" VARCHAR(128) NOT NULL');
  });

  it('does not store clinical payloads or invoke a remote provider', () => {
    expect(migration).not.toMatch(/clinicalPayload|payload\s+JSON/i);
    expect(migration).not.toMatch(/satusehat|https?:\/\//i);
  });
});
