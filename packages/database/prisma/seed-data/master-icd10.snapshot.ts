import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MASTER_ICD10_SNAPSHOT_SOURCE = 'SATUSEHAT';
export const MASTER_ICD10_SNAPSHOT_VERSION = 'ICD10_2010';
export const MASTER_ICD10_SNAPSHOT_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/12_72PvHRLWny3VEwodEI6TRDc7QqWdiF/edit?gid=0';

export interface MasterIcd10SeedRecord {
  code: string;
  display: string;
  nameIndo?: string;
  nameEng: string;
  displayOrder: number;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

function loadIcd10Snapshot(): readonly MasterIcd10SeedRecord[] {
  const csv = readFileSync(
    join(__dirname, 'master-icd10.snapshot.csv'),
    'utf8',
  );
  const rows = csv
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
  const [codeHeader, displayHeader, versionHeader] = rows[0] ?? [];

  if (
    codeHeader !== 'CODE' ||
    displayHeader !== 'DISPLAY' ||
    versionHeader !== 'VERSION'
  ) {
    throw new Error('Format snapshot ICD-10 tidak sesuai header canonical.');
  }

  const snapshot = rows.slice(1).map((row, index) => {
    const [code, display, version] = row;
    if (!code || !display || version !== MASTER_ICD10_SNAPSHOT_VERSION) {
      throw new Error(`Baris snapshot ICD-10 tidak valid pada posisi ${index + 2}.`);
    }

    return {
      code,
      display,
      nameEng: display,
      displayOrder: index + 1,
    };
  });

  const uniqueCodes = new Set(snapshot.map((record) => record.code));
  if (uniqueCodes.size !== snapshot.length) {
    throw new Error('Snapshot ICD-10 memiliki kode duplikat.');
  }

  return snapshot;
}

/**
 * Offline canonical ICD-10 terminology from the public Kemenkes/SATUSEHAT
 * ICD-10 2010 spreadsheet. The CSV is bundled with the repository so the
 * application never reads through to a provider at runtime.
 */
export const MASTER_ICD10_SNAPSHOT = loadIcd10Snapshot();
