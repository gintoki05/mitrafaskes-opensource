import {
  LocationType,
  LocationMode,
  LocationStatus,
  OrganizationType,
  ServiceUnitType,
} from '@prisma/client';

export interface MasterDataValidationIssue {
  field: string;
  code: string;
  message: string;
}

export class MasterDataValidationError extends Error {
  constructor(readonly issues: MasterDataValidationIssue[]) {
    super('Data master faskes tidak valid');
    this.name = 'MasterDataValidationError';
  }
}

export interface ValidatedOrganizationInput {
  code: string;
  name: string;
  type: OrganizationType;
  parentId?: string;
  addressText?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface ValidatedServiceUnitInput {
  organizationId: string;
  parentId?: string;
  code: string;
  name: string;
  type: ServiceUnitType;
  active: boolean;
}

export interface ValidatedLocationInput {
  organizationId: string;
  serviceUnitId?: string;
  parentId?: string;
  code: string;
  name: string;
  type: LocationType;
  description?: string;
  status: LocationStatus;
  mode: LocationMode;
  physicalTypeCode?: string;
  addressText?: string;
  city?: string;
  postalCode?: string;
  countryCode: string;
  active: boolean;
}

const enumValues = <T extends Record<string, string>>(value: T): string[] =>
  Object.values(value);

const asRecord = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
};

const normalizeCode = (value: unknown): string | undefined => {
  const normalized = normalizeText(value)?.toUpperCase();
  return normalized;
};

const optionalId = (value: unknown): string | undefined => {
  const normalized = normalizeText(value);
  return normalized;
};

const readText = (
  body: Record<string, unknown>,
  field: string,
  issues: MasterDataValidationIssue[],
  maxLength: number,
  label: string,
): string | undefined => {
  const value = normalizeText(body[field]);
  if (!value) {
    issues.push({ field, code: 'REQUIRED', message: `${label} wajib diisi` });
    return undefined;
  }
  if (value.length > maxLength) {
    issues.push({
      field,
      code: 'INVALID_LENGTH',
      message: `${label} maksimal ${maxLength} karakter`,
    });
    return undefined;
  }
  return value;
};

const readCode = (
  body: Record<string, unknown>,
  issues: MasterDataValidationIssue[],
): string | undefined => {
  const code = normalizeCode(body.code);
  if (!code) {
    issues.push({
      field: 'code',
      code: 'REQUIRED',
      message: 'Kode wajib diisi',
    });
    return undefined;
  }
  if (code.length > 64 || !/^[A-Z0-9][A-Z0-9._-]*$/.test(code)) {
    issues.push({
      field: 'code',
      code: 'INVALID_CODE',
      message:
        'Kode hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung',
    });
    return undefined;
  }
  return code;
};

const readEnum = <T extends Record<string, string>>(
  body: Record<string, unknown>,
  field: string,
  values: T,
  fallback: T[keyof T],
  issues: MasterDataValidationIssue[],
): T[keyof T] | undefined => {
  const value = body[field] === undefined ? fallback : body[field];
  if (typeof value !== 'string' || !enumValues(values).includes(value)) {
    issues.push({
      field,
      code: 'INVALID_ENUM',
      message: `${field} memiliki nilai yang tidak didukung`,
    });
    return undefined;
  }
  return value as T[keyof T];
};

const readActive = (
  body: Record<string, unknown>,
  issues: MasterDataValidationIssue[],
): boolean => {
  if (body.active === undefined) return true;
  if (typeof body.active !== 'boolean') {
    issues.push({
      field: 'active',
      code: 'INVALID_TYPE',
      message: 'active harus berupa boolean',
    });
    return true;
  }
  return body.active;
};

const readOptionalText = (
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  issues: MasterDataValidationIssue[],
): string | undefined => {
  if (body[field] === undefined || body[field] === null || body[field] === '') {
    return undefined;
  }
  const value = normalizeText(body[field]);
  if (!value) {
    issues.push({
      field,
      code: 'INVALID_TYPE',
      message: `${field} harus berupa teks`,
    });
    return undefined;
  }
  if (value.length > maxLength) {
    issues.push({
      field,
      code: 'INVALID_LENGTH',
      message: `${field} maksimal ${maxLength} karakter`,
    });
    return undefined;
  }
  return value;
};

const readOrganizationContact = (
  body: Record<string, unknown>,
  issues: MasterDataValidationIssue[],
) => {
  const addressText = readOptionalText(body, 'addressText', 500, issues);
  const phone = readOptionalText(body, 'phone', 32, issues);
  if (phone && !/^(?:\+?[1-9]\d{7,14}|0\d{7,14})$/.test(phone)) {
    issues.push({
      field: 'phone',
      code: 'INVALID_PHONE_FORMAT',
      message: 'Nomor telepon tidak valid',
    });
  }
  const email = readOptionalText(body, 'email', 255, issues)?.toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({
      field: 'email',
      code: 'INVALID_EMAIL_FORMAT',
      message: 'Alamat email tidak valid',
    });
  }
  return { addressText, phone, email };
};

const finish = <T>(issues: MasterDataValidationIssue[], value: T): T => {
  if (issues.length > 0) throw new MasterDataValidationError(issues);
  return value;
};

export const validateOrganizationInput = (
  input: unknown,
): ValidatedOrganizationInput => {
  const body = asRecord(input);
  const issues: MasterDataValidationIssue[] = [];
  const code = readCode(body, issues);
  const name = readText(body, 'name', issues, 150, 'Nama organisasi');
  const type = readEnum(
    body,
    'type',
    OrganizationType,
    OrganizationType.HEALTHCARE_FACILITY,
    issues,
  );
  const parentId = optionalId(body.parentId);
  if (type === OrganizationType.SUB_ORGANIZATION && !parentId) {
    issues.push({
      field: 'parentId',
      code: 'PARENT_REQUIRED_FOR_SUB_ORGANIZATION',
      message: 'Sub-organisasi wajib memiliki organisasi induk',
    });
  }
  if (type === OrganizationType.HEALTHCARE_FACILITY && parentId) {
    issues.push({
      field: 'parentId',
      code: 'PARENT_NOT_ALLOWED_FOR_HEALTHCARE_FACILITY',
      message: 'Faskes/organisasi induk tidak boleh memiliki organisasi induk',
    });
  }
  const contact = readOrganizationContact(body, issues);
  const active = readActive(body, issues);

  return finish(issues, {
    code: code!,
    name: name!,
    type: type!,
    parentId,
    ...contact,
    active,
  });
};

export const validateServiceUnitInput = (
  input: unknown,
): ValidatedServiceUnitInput => {
  const body = asRecord(input);
  const issues: MasterDataValidationIssue[] = [];
  const organizationId = optionalId(body.organizationId);
  if (!organizationId) {
    issues.push({
      field: 'organizationId',
      code: 'REQUIRED',
      message: 'Organisasi induk wajib dipilih',
    });
  }
  const parentId = optionalId(body.parentId);
  const code = readCode(body, issues);
  const name = readText(body, 'name', issues, 150, 'Nama unit layanan');
  const type = readEnum(
    body,
    'type',
    ServiceUnitType,
    ServiceUnitType.POLYCLINIC,
    issues,
  );
  const active = readActive(body, issues);

  return finish(issues, {
    organizationId: organizationId!,
    parentId,
    code: code!,
    name: name!,
    type: type!,
    active,
  });
};

export const validateLocationInput = (
  input: unknown,
): ValidatedLocationInput => {
  const body = asRecord(input);
  const issues: MasterDataValidationIssue[] = [];
  const organizationId = optionalId(body.organizationId);
  if (!organizationId) {
    issues.push({
      field: 'organizationId',
      code: 'REQUIRED',
      message: 'Organisasi induk wajib dipilih',
    });
  }
  const serviceUnitId = optionalId(body.serviceUnitId);
  const parentId = optionalId(body.parentId);
  const code = readCode(body, issues);
  const name = readText(body, 'name', issues, 150, 'Nama lokasi');
  const type = readEnum(body, 'type', LocationType, LocationType.ROOM, issues);
  const description = readOptionalText(body, 'description', 500, issues);
  const status = readEnum(
    body,
    'status',
    LocationStatus,
    LocationStatus.ACTIVE,
    issues,
  );
  const mode = readEnum(
    body,
    'mode',
    LocationMode,
    LocationMode.INSTANCE,
    issues,
  );
  const physicalTypeCode = readOptionalText(
    body,
    'physicalTypeCode',
    32,
    issues,
  )?.toUpperCase();
  const addressText = readOptionalText(body, 'addressText', 500, issues);
  const city = readOptionalText(body, 'city', 100, issues);
  const postalCode = readOptionalText(body, 'postalCode', 16, issues);
  const rawCountryCode =
    body.countryCode === undefined ? 'ID' : body.countryCode;
  const countryCode =
    typeof rawCountryCode === 'string'
      ? rawCountryCode.trim().toUpperCase()
      : '';
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    issues.push({
      field: 'countryCode',
      code: 'INVALID_COUNTRY_CODE',
      message: 'countryCode harus berupa kode negara ISO 3166-1 alpha-2',
    });
  }
  const active = readActive(body, issues);

  return finish(issues, {
    organizationId: organizationId!,
    serviceUnitId,
    parentId,
    code: code!,
    name: name!,
    type: type!,
    description,
    status: status!,
    mode: mode!,
    physicalTypeCode,
    addressText,
    city,
    postalCode,
    countryCode,
    active,
  });
};
