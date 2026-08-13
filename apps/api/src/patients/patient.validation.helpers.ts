import { PatientIdentifierType } from '@mitrafaskes/shared';
import type { PatientValidationIssue } from './patient.validation.types';

export const enumValues = <T extends string>(
  enumObject: Record<string, T>,
): readonly T[] => Object.values(enumObject);

export const normalizeOptionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
};

export const normalizeTextArray = (
  value: unknown,
  field: string,
  issues: PatientValidationIssue[],
): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push({
      field,
      code: 'INVALID_TYPE',
      message: `${field} harus berupa array teks`,
    });
    return [];
  }

  const normalized = value.map(normalizeOptionalText);
  if (normalized.some((entry) => !entry)) {
    issues.push({
      field,
      code: 'INVALID_VALUE',
      message: `${field} tidak boleh memuat teks kosong atau nilai non-teks`,
    });
  }
  return normalized.filter((entry): entry is string => Boolean(entry));
};

export const normalizeNik = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[\d\s.-]+$/.test(trimmed)) return '';

  return trimmed.replace(/[\s.-]/g, '');
};

export const normalizePhone = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return '';

  return trimmed.replace(/[\s().-]/g, '');
};

export const normalizeIdentifierValue = (
  type: PatientIdentifierType,
  value: unknown,
): string | undefined => {
  if (
    type === PatientIdentifierType.NIK ||
    type === PatientIdentifierType.MOTHER_NIK
  ) {
    return normalizeNik(value);
  }

  const text = normalizeOptionalText(value);
  return text ? text.toUpperCase() : text;
};

export const parseDateOnly = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return undefined;
  }
  return parsed;
};

export const parseOptionalDateTime = (
  value: unknown,
  field: string,
  issues: PatientValidationIssue[],
): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    issues.push({
      field,
      code: 'INVALID_DATE',
      message: `${field} harus berupa tanggal/waktu ISO-8601`,
    });
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    issues.push({
      field,
      code: 'INVALID_DATE',
      message: `${field} harus berupa tanggal/waktu ISO-8601`,
    });
    return undefined;
  }
  return parsed;
};

export const validatePeriod = (
  validFrom: Date | undefined,
  validTo: Date | undefined,
  field: string,
  issues: PatientValidationIssue[],
): void => {
  if (validFrom && validTo && validTo < validFrom) {
    issues.push({
      field,
      code: 'INVALID_PERIOD',
      message: 'Akhir periode tidak boleh mendahului awal periode',
    });
  }
};

export const readEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  issues: PatientValidationIssue[],
): T | undefined => {
  const normalized =
    typeof value === 'string' ? value.trim().toUpperCase() : undefined;
  if (!normalized || !allowed.includes(normalized as T)) {
    issues.push({
      field,
      code: 'INVALID_ENUM',
      message: `${field} memiliki nilai yang tidak didukung`,
    });
    return undefined;
  }
  return normalized as T;
};

export const readBoolean = (
  value: unknown,
  fallback: boolean,
  field: string,
  issues: PatientValidationIssue[],
): boolean => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  issues.push({
    field,
    code: 'INVALID_TYPE',
    message: `${field} harus berupa boolean`,
  });
  return fallback;
};

export const readPositiveInteger = (
  value: unknown,
  field: string,
  issues: PatientValidationIssue[],
  required = false,
): number | undefined => {
  if (value === undefined || value === null) {
    if (required) {
      issues.push({
        field,
        code: 'REQUIRED',
        message: `${field} wajib diisi`,
      });
    }
    return undefined;
  }
  if (!Number.isInteger(value) || Number(value) <= 0) {
    issues.push({
      field,
      code: 'INVALID_NUMBER',
      message: `${field} harus berupa bilangan bulat positif`,
    });
    return undefined;
  }
  return Number(value);
};

export const readObjectArray = (
  value: unknown,
  field: string,
  issues: PatientValidationIssue[],
): Record<string, unknown>[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push({
      field,
      code: 'INVALID_TYPE',
      message: `${field} harus berupa array`,
    });
    return [];
  }

  const result: Record<string, unknown>[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      issues.push({
        field: `${field}[${index}]`,
        code: 'INVALID_TYPE',
        message: `${field}[${index}] harus berupa object`,
      });
    } else {
      result.push(entry as Record<string, unknown>);
    }
  });
  return result;
};
