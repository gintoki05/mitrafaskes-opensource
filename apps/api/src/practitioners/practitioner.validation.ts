import { Gender, Role } from '@prisma/client';

export class PractitionerValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'PractitionerValidationError';
  }
}

export interface ValidatedPractitionerUpdate {
  nik?: string | null;
  birthDate?: Date | null;
  gender?: Gender | null;
  organizationId?: string | null;
  locationIds?: string[];
  active?: boolean;
}

export interface ValidatedPractitionerCreate {
  username: string;
  password: string;
  fullName: string;
  role: Role;
  accessRoleId?: string | null;
  nik?: string | null;
  birthDate?: Date | null;
  gender?: Gender | null;
  sipNumber?: string | null;
  strNumber?: string | null;
  organizationId?: string | null;
  locationIds: string[];
  active: boolean;
}

export function validatePractitionerCreate(
  input: unknown,
): ValidatedPractitionerCreate {
  const body = isRecord(input) ? input : {};
  const issues: { field: string; message: string }[] = [];
  const username = readRequiredText(body.username, 'username', 64, issues);
  const password = readRequiredText(body.password, 'password', 128, issues);
  const fullName = readRequiredText(body.fullName, 'fullName', 150, issues);
  const role =
    body.role === Role.DOKTER ||
    body.role === Role.PERAWAT ||
    body.role === Role.PETUGAS_PENDAFTARAN
      ? body.role
      : undefined;
  if (!role) {
    issues.push({
      field: 'role',
      message: 'Role harus DOKTER, PERAWAT, atau PETUGAS_PENDAFTARAN.',
    });
  }
  const accessRoleId = Object.prototype.hasOwnProperty.call(
    body,
    'accessRoleId',
  )
    ? readOptionalId(body.accessRoleId, 'accessRoleId', issues)
    : undefined;
  if (username && !/^[a-zA-Z0-9._-]+$/.test(username)) {
    issues.push({
      field: 'username',
      message:
        'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.',
    });
  }
  if (password && password.length < 8) {
    issues.push({
      field: 'password',
      message: 'Password awal minimal 8 karakter.',
    });
  }

  const nik = optionalText(body.nik);
  if (nik && !/^\d{16}$/.test(nik)) {
    issues.push({ field: 'nik', message: 'NIK harus terdiri dari 16 digit.' });
  }

  const birthDate = readBirthDate(body.birthDate, issues);
  const gender = readGender(body.gender, issues);
  const sipNumber = readOptionalField(body.sipNumber, 'sipNumber', 64, issues);
  const strNumber = readOptionalField(body.strNumber, 'strNumber', 64, issues);
  const organizationId = readOptionalId(
    body.organizationId,
    'organizationId',
    issues,
  );
  const legacyLocationId = Object.prototype.hasOwnProperty.call(
    body,
    'locationIds',
  )
    ? undefined
    : readOptionalId(body.locationId, 'locationId', issues);
  const locationIds = readLocationIds(body, legacyLocationId, issues);
  const active = readActive(body.active, issues);

  if (issues.length > 0) {
    throw new PractitionerValidationError(
      'Data Practitioner tidak valid.',
      issues,
    );
  }

  return {
    username: username!,
    password: password!,
    fullName: fullName!,
    role: role!,
    ...(accessRoleId === undefined ? {} : { accessRoleId }),
    nik: nik ?? null,
    ...(birthDate === undefined ? {} : { birthDate }),
    ...(gender === undefined ? {} : { gender }),
    sipNumber,
    strNumber,
    organizationId: organizationId ?? null,
    locationIds,
    active,
  };
}

export function validatePractitionerUpdate(
  input: unknown,
): ValidatedPractitionerUpdate {
  const body = isRecord(input) ? input : {};
  const issues: { field: string; message: string }[] = [];
  const result: ValidatedPractitionerUpdate = {};

  if (Object.prototype.hasOwnProperty.call(body, 'nik')) {
    const value = optionalText(body.nik);
    if (value && !/^\d{16}$/.test(value)) {
      issues.push({
        field: 'nik',
        message: 'NIK harus terdiri dari 16 digit.',
      });
    } else {
      result.nik = value ?? null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'birthDate')) {
    const value = optionalText(body.birthDate);
    if (!value) {
      result.birthDate = null;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      issues.push({
        field: 'birthDate',
        message: 'Tanggal lahir harus berformat YYYY-MM-DD.',
      });
    } else {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
      ) {
        issues.push({
          field: 'birthDate',
          message: 'Tanggal lahir tidak valid.',
        });
      } else {
        result.birthDate = parsed;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'gender')) {
    if (body.gender === null || body.gender === '') {
      result.gender = null;
    } else if (body.gender === Gender.MALE || body.gender === Gender.FEMALE) {
      result.gender = body.gender === Gender.MALE ? Gender.MALE : Gender.FEMALE;
    } else {
      issues.push({
        field: 'gender',
        message: 'Jenis kelamin harus MALE, FEMALE, atau dikosongkan.',
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'organizationId')) {
    result.organizationId = readOptionalId(
      body.organizationId,
      'organizationId',
      issues,
    );
  }

  const hasLocationIds = 'locationIds' in body;
  const hasLegacyLocationId = 'locationId' in body;
  if (hasLocationIds || hasLegacyLocationId) {
    const legacyLocationId = hasLocationIds
      ? undefined
      : readOptionalId(body.locationId, 'locationId', issues);
    result.locationIds = readLocationIds(body, legacyLocationId, issues);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'active')) {
    if (typeof body.active !== 'boolean') {
      issues.push({
        field: 'active',
        message: 'Status aktif harus berupa boolean.',
      });
    } else {
      result.active = body.active;
    }
  }

  if (Object.keys(result).length === 0 && issues.length === 0) {
    issues.push({
      field: 'body',
      message: 'Tidak ada perubahan Practitioner.',
    });
  }

  if (issues.length > 0) {
    throw new PractitionerValidationError(
      'Data Practitioner tidak valid.',
      issues,
    );
  }

  return result;
}

function readRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
  issues: { field: string; message: string }[],
): string | undefined {
  const text = optionalText(value);
  if (!text) {
    issues.push({ field, message: `${field} wajib diisi.` });
    return undefined;
  }
  if (text.length > maxLength) {
    issues.push({ field, message: `${field} maksimal ${maxLength} karakter.` });
    return undefined;
  }
  return text;
}

function readOptionalField(
  value: unknown,
  field: string,
  maxLength: number,
  issues: { field: string; message: string }[],
): string | null | undefined {
  const text = optionalText(value);
  if (!text) return null;
  if (text.length > maxLength) {
    issues.push({ field, message: `${field} maksimal ${maxLength} karakter.` });
    return undefined;
  }
  return text;
}

function readOptionalId(
  value: unknown,
  field: string,
  issues: { field: string; message: string }[],
): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    issues.push({ field, message: `${field} harus berupa ID teks.` });
    return undefined;
  }
  const text = value.trim();
  if (!text) return null;
  if (text.length > 64) {
    issues.push({ field, message: `${field} maksimal 64 karakter.` });
    return undefined;
  }
  return text;
}

function readLocationIds(
  body: Record<string, unknown>,
  legacyLocationId: string | null | undefined,
  issues: { field: string; message: string }[],
): string[] {
  if (!Object.prototype.hasOwnProperty.call(body, 'locationIds')) {
    return legacyLocationId ? [legacyLocationId] : [];
  }

  const value = body.locationIds;
  if (value === undefined || value === null || value === '') return [];
  if (!Array.isArray(value)) {
    issues.push({
      field: 'locationIds',
      message: 'locationIds harus berupa daftar ID location.',
    });
    return [];
  }
  if (value.length > 100) {
    issues.push({
      field: 'locationIds',
      message: 'Maksimal 100 location dapat ditugaskan sekaligus.',
    });
  }

  const ids: string[] = [];
  for (const item of value.slice(0, 100)) {
    if (typeof item !== 'string') {
      issues.push({
        field: 'locationIds',
        message: 'Setiap locationId harus berupa ID teks.',
      });
      continue;
    }
    const id = item.trim();
    if (!id) continue;
    if (id.length > 64) {
      issues.push({
        field: 'locationIds',
        message: 'ID location maksimal 64 karakter.',
      });
      continue;
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function readBirthDate(
  value: unknown,
  issues: { field: string; message: string }[],
): Date | null | undefined {
  const text = optionalText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    issues.push({
      field: 'birthDate',
      message: 'Tanggal lahir harus berformat YYYY-MM-DD.',
    });
    return undefined;
  }
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== text
  ) {
    issues.push({ field: 'birthDate', message: 'Tanggal lahir tidak valid.' });
    return undefined;
  }
  return parsed;
}

function readGender(
  value: unknown,
  issues: { field: string; message: string }[],
): Gender | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (value === Gender.MALE || value === Gender.FEMALE) return value;
  issues.push({
    field: 'gender',
    message: 'Jenis kelamin harus MALE, FEMALE, atau dikosongkan.',
  });
  return undefined;
}

function readActive(
  value: unknown,
  issues: { field: string; message: string }[],
): boolean {
  if (value === undefined) return true;
  if (typeof value !== 'boolean') {
    issues.push({
      field: 'active',
      message: 'Status aktif harus berupa boolean.',
    });
    return true;
  }
  return value;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
