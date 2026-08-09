import type { RegionLevel } from '@mitrafaskes/shared';
import type { MasterWilayahProviderRecord } from './master-wilayah.provider';

const PARENT_LEVEL_BY_LEVEL: Readonly<Record<RegionLevel, RegionLevel | null>> = {
  PROVINCE: null,
  REGENCY: 'PROVINCE',
  DISTRICT: 'REGENCY',
  VILLAGE: 'DISTRICT',
};

const REGION_LEVELS = new Set<RegionLevel>([
  'PROVINCE',
  'REGENCY',
  'DISTRICT',
  'VILLAGE',
]);

export class MasterRegionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MasterRegionValidationError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MasterRegionValidationError(
      `Field wilayah ${field} wajib diisi`,
    );
  }

  return value.trim().replace(/\s+/g, ' ');
};

const normalizeCode = (value: unknown, field: string): string => {
  const normalized = normalizeText(value, field);
  if (!/^\d+$/.test(normalized)) {
    throw new MasterRegionValidationError(
      `Kode wilayah ${field} hanya boleh berisi angka`,
    );
  }

  return normalized;
};

export function parseRegionLevel(value: unknown): RegionLevel {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!REGION_LEVELS.has(normalized as RegionLevel)) {
    throw new MasterRegionValidationError(
      'Level wilayah harus PROVINCE, REGENCY, DISTRICT, atau VILLAGE',
    );
  }

  return normalized as RegionLevel;
}

export function normalizeMasterWilayahRecord(
  value: unknown,
): MasterWilayahProviderRecord {
  if (!isRecord(value)) {
    throw new MasterRegionValidationError('Record wilayah tidak valid');
  }

  const level = parseRegionLevel(value.level);
  const code = normalizeCode(value.code, 'code');
  const parentCode = value.parentCode
    ? normalizeCode(value.parentCode, 'parentCode')
    : undefined;
  const bpsCode = value.bpsCode
    ? normalizeCode(value.bpsCode, 'bpsCode')
    : undefined;

  if (level === 'PROVINCE' && parentCode) {
    throw new MasterRegionValidationError(
      `Provinsi ${code} tidak boleh memiliki parentCode`,
    );
  }

  if (level !== 'PROVINCE' && !parentCode) {
    throw new MasterRegionValidationError(
      `Wilayah ${code} pada level ${level} wajib memiliki parentCode`,
    );
  }

  return {
    level,
    code,
    parentCode,
    bpsCode,
    name: normalizeText(value.name, 'name'),
  };
}

export function validateMasterWilayahSnapshot(
  values: readonly unknown[],
): MasterWilayahProviderRecord[] {
  const normalized = values.map(normalizeMasterWilayahRecord);
  if (normalized.length === 0) {
    throw new MasterRegionValidationError(
      'Snapshot Master Wilayah tidak boleh kosong',
    );
  }
  const keys = new Set<string>();

  for (const record of normalized) {
    const key = `${record.level}:${record.code}`;
    if (keys.has(key)) {
      throw new MasterRegionValidationError(
        `Duplikat kode wilayah ${record.code} pada level ${record.level}`,
      );
    }
    keys.add(key);
  }

  for (const record of normalized) {
    const parentLevel = PARENT_LEVEL_BY_LEVEL[record.level];
    if (!parentLevel || !record.parentCode) continue;

    const parentKey = `${parentLevel}:${record.parentCode}`;
    if (!keys.has(parentKey)) {
      throw new MasterRegionValidationError(
        `Parent ${record.parentCode} untuk wilayah ${record.code} tidak ditemukan`,
      );
    }
  }

  return normalized;
}
