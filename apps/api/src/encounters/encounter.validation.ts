import { EncounterStatus } from '@mitrafaskes/shared';
import { EncounterValidationError } from './encounter.errors';
import { parseFacilityDate } from './encounter.constants';

const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : {};

const requiredId = (
  input: Record<string, unknown>,
  field: string,
  issues: Array<{ field: string; message: string }>,
): string => {
  const value = input[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ field, message: `${field} wajib diisi` });
    return '';
  }
  return value.trim();
};

export interface ValidatedCreateEncounterInput {
  patientId: string;
  locationId: string;
  doctorId: string;
}

export function validateCreateEncounter(
  input: unknown,
): ValidatedCreateEncounterInput {
  const body = recordOf(input);
  const issues: Array<{ field: string; message: string }> = [];
  const result = {
    patientId: requiredId(body, 'patientId', issues),
    locationId: requiredId(body, 'locationId', issues),
    doctorId: requiredId(body, 'doctorId', issues),
  };
  if (issues.length > 0) {
    throw new EncounterValidationError(
      'Data pendaftaran kunjungan belum lengkap',
      issues,
    );
  }
  return result;
}

export interface ValidatedStatusInput {
  status: EncounterStatus;
  expectedVersion: number;
}

export function validateStatusUpdate(input: unknown): ValidatedStatusInput {
  const body = recordOf(input);
  const issues: Array<{ field: string; message: string }> = [];
  const status = body.status;
  const expectedVersion = body.expectedVersion;
  if (!Object.values(EncounterStatus).includes(status as EncounterStatus)) {
    issues.push({ field: 'status', message: 'Status Encounter tidak valid' });
  }
  if (
    typeof expectedVersion !== 'number' ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1
  ) {
    issues.push({
      field: 'expectedVersion',
      message: 'Versi Encounter tidak valid',
    });
  }
  if (issues.length > 0) {
    throw new EncounterValidationError('Perubahan status tidak valid', issues);
  }
  return {
    status: status as EncounterStatus,
    expectedVersion: expectedVersion as number,
  };
}

export const parseEncounterStatus = (
  value: string | undefined,
): EncounterStatus | undefined => {
  if (!value) return undefined;
  if (!Object.values(EncounterStatus).includes(value as EncounterStatus)) {
    throw new EncounterValidationError('Filter status Encounter tidak valid', [
      { field: 'status', message: 'Status Encounter tidak valid' },
    ]);
  }
  return value as EncounterStatus;
};

export const parseEncounterStatuses = (
  value: string | undefined,
): EncounterStatus[] | undefined => {
  if (!value) return undefined;
  const statuses = value
    .split(',')
    .map((status) => status.trim())
    .filter(Boolean);
  if (
    statuses.length === 0 ||
    statuses.some(
      (status) =>
        !Object.values(EncounterStatus).includes(status as EncounterStatus),
    )
  ) {
    throw new EncounterValidationError('Filter status Encounter tidak valid', [
      { field: 'statuses', message: 'Status Encounter tidak valid' },
    ]);
  }
  return [...new Set(statuses)] as EncounterStatus[];
};

export interface ValidatedEncounterHistoryDateRange {
  fromDate: Date;
  toDate: Date;
}

export function validateEncounterHistoryDateRange(
  fromDate: string | undefined,
  toDate: string | undefined,
): ValidatedEncounterHistoryDateRange {
  const issues: Array<{ field: string; message: string }> = [];
  let parsedFromDate: Date | undefined;
  let parsedToDate: Date | undefined;

  if (!fromDate) {
    issues.push({
      field: 'fromDate',
      message: 'Tanggal mulai wajib diisi',
    });
  } else {
    try {
      parsedFromDate = parseFacilityDate(fromDate);
    } catch {
      issues.push({
        field: 'fromDate',
        message: 'Tanggal mulai harus berformat YYYY-MM-DD dan valid',
      });
    }
  }

  if (!toDate) {
    issues.push({
      field: 'toDate',
      message: 'Tanggal akhir wajib diisi',
    });
  } else {
    try {
      parsedToDate = parseFacilityDate(toDate);
    } catch {
      issues.push({
        field: 'toDate',
        message: 'Tanggal akhir harus berformat YYYY-MM-DD dan valid',
      });
    }
  }

  if (parsedFromDate && parsedToDate && parsedFromDate > parsedToDate) {
    issues.push({
      field: 'dateRange',
      message: 'Tanggal mulai tidak boleh setelah tanggal akhir',
    });
  }

  if (issues.length > 0 || !parsedFromDate || !parsedToDate) {
    throw new EncounterValidationError(
      'Rentang tanggal riwayat kunjungan tidak valid',
      issues,
    );
  }

  return { fromDate: parsedFromDate, toDate: parsedToDate };
}

export const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  maximum = 100,
): number => {
  const parsed = value ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};
