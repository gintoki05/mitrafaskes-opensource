import { AccessPermission, WorkProfileType } from '@mitrafaskes/shared';

export type AccountCreateInput = {
  username: string;
  fullName: string;
  accessRoleId: string;
  workProfileType: WorkProfileType;
  nik?: string | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  sipNumber?: string | null;
  strNumber?: string | null;
  organizationId?: string | null;
  locationIds?: string[];
};

export type AccountUpdateInput = Partial<
  Omit<AccountCreateInput, 'username'>
> & {
  username?: string;
};

export type AccountListInput = {
  search?: string;
  active?: boolean;
  accessRoleId?: string;
  workProfileType?: WorkProfileType;
  page?: number;
  pageSize?: number;
};

export function validateAccountCreate(input: unknown): AccountCreateInput {
  const body = record(input);
  const username = required(body.username, 'username', 64);
  if (username && !/^[a-zA-Z0-9._-]+$/.test(username)) {
    throw validation(
      'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.',
    );
  }
  const fullName = required(body.fullName, 'fullName', 150);
  const accessRoleId = required(body.accessRoleId, 'accessRoleId', 64);
  const workProfileType = profileType(body.workProfileType);
  return {
    username: username.toLowerCase(),
    fullName,
    accessRoleId,
    workProfileType,
    nik: optional(body.nik),
    birthDate: date(body.birthDate),
    gender: gender(body.gender),
    sipNumber: optional(body.sipNumber),
    strNumber: optional(body.strNumber),
    organizationId: optional(body.organizationId),
    locationIds: ids(body.locationIds),
  };
}

export function validateAccountUpdate(input: unknown): AccountUpdateInput {
  const body = record(input);
  const result: AccountUpdateInput = {};
  if ('username' in body)
    result.username = required(body.username, 'username', 64).toLowerCase();
  if ('fullName' in body)
    result.fullName = required(body.fullName, 'fullName', 150);
  if ('accessRoleId' in body)
    result.accessRoleId = required(body.accessRoleId, 'accessRoleId', 64);
  if ('workProfileType' in body)
    result.workProfileType = profileType(body.workProfileType);
  if ('nik' in body) result.nik = optional(body.nik);
  if ('birthDate' in body) result.birthDate = date(body.birthDate);
  if ('gender' in body) result.gender = gender(body.gender);
  if ('sipNumber' in body) result.sipNumber = optional(body.sipNumber);
  if ('strNumber' in body) result.strNumber = optional(body.strNumber);
  if ('organizationId' in body)
    result.organizationId = optional(body.organizationId);
  if ('locationIds' in body) result.locationIds = ids(body.locationIds);
  if (Object.keys(result).length === 0)
    throw validation('Tidak ada perubahan akun.');
  return result;
}

export function validateRolePermissions(input: unknown): AccessPermission[] {
  const body = record(input);
  if (!Array.isArray(body.permissions))
    throw validation('permissions harus berupa daftar kode permission.');
  return body.permissions.filter(
    (item): item is AccessPermission => typeof item === 'string',
  );
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object')
    throw validation('Payload tidak valid.');
  return input as Record<string, unknown>;
}

function required(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim())
    throw validation(`${field} wajib diisi.`);
  const result = value.trim();
  if (result.length > max)
    throw validation(`${field} maksimal ${max} karakter.`);
  return result;
}

function optional(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw validation('Nilai teks tidak valid.');
  return value.trim() || null;
}

function date(value: unknown): string | null {
  const result = optional(value);
  if (!result) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(new Date(`${result}T00:00:00.000Z`).getTime())
  ) {
    throw validation('Tanggal lahir harus berformat YYYY-MM-DD.');
  }
  return result;
}

function gender(value: unknown): 'MALE' | 'FEMALE' | null {
  if (value === null || value === undefined || value === '') return null;
  if (value !== 'MALE' && value !== 'FEMALE')
    throw validation('Jenis kelamin harus MALE atau FEMALE.');
  return value;
}

function profileType(value: unknown): WorkProfileType {
  if (
    value === WorkProfileType.DOKTER ||
    value === WorkProfileType.PERAWAT ||
    value === WorkProfileType.NON_CLINICAL
  )
    return value;
  throw validation('Jenis profil kerja tidak valid.');
}

function ids(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value))
    throw validation('locationIds harus berupa daftar ID.');
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 100);
}

function validation(message: string): Error {
  const error = new Error(message);
  error.name = 'AccountValidationError';
  return error;
}
