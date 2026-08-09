import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('structured patient migration', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../../../packages/database/prisma/migrations/20260731140000_structured_patient_demographics/migration.sql',
    ),
    'utf8',
  );

  it('keeps compatibility columns and backfills every legacy demographic field', () => {
    expect(migration).not.toMatch(
      /DROP\s+COLUMN\s+"(?:nik|fullName|phone|address|satusehatId)"/i,
    );
    expect(migration).toMatch(
      /FROM\s+"Patient"\s+WHERE\s+"nik"\s+IS\s+NOT\s+NULL/i,
    );
    expect(migration).toContain('\'OFFICIAL\'::"PatientNameUse"');
    expect(migration).toContain('\'PHONE\'::"TelecomSystem"');
    expect(migration).toContain('\'HOME\'::"AddressUse"');
  });

  it('defines partial uniqueness for active national NIK and primary identifiers', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "PatientIdentifier_active_nik_national_key"',
    );
    expect(migration).toContain(`WHERE "type" = 'NIK' AND "active" = true`);
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "PatientIdentifier_active_primary_per_type_key"',
    );
  });

  it('does not contain network or external-resource migration work', () => {
    expect(migration).not.toMatch(/https?:\/\//i);
    expect(migration).not.toMatch(/external_resource_links/i);
  });
});
