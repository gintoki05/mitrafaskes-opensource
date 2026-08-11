import {
  AddressType,
  AddressUse,
  Gender,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
} from '@mitrafaskes/shared';

export interface PatientValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidatedPatientIdentifierInput {
  type: PatientIdentifierType;
  system: string;
  value: string;
  normalizedValue: string;
  verificationStatus: VerificationStatus;
  isPrimary: boolean;
  active: boolean;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedPatientNameInput {
  use: PatientNameUse;
  text: string;
  given: string[];
  family?: string;
  prefix: string[];
  suffix: string[];
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedPatientTelecomInput {
  system: TelecomSystem;
  value: string;
  normalizedValue: string;
  use: TelecomUse;
  rank: number;
  verificationStatus: VerificationStatus;
  active: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedPatientAddressInput {
  use: AddressUse;
  type: AddressType;
  text?: string;
  lines: string[];
  postalCode?: string;
  countryCode?: string;
  provinceCode?: string;
  provinceName?: string;
  regencyCode?: string;
  regencyName?: string;
  districtCode?: string;
  districtName?: string;
  villageCode?: string;
  villageName?: string;
  active: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedRelatedPersonInput {
  fullName: string;
  gender?: Gender;
  birthDate?: Date;
  phone?: string;
  email?: string;
  addressText?: string;
}

export interface ValidatedPatientRelationshipInput {
  relationshipCode: PatientRelationshipCode;
  relatedPatientId?: string;
  relatedPersonId?: string;
  relatedPerson?: ValidatedRelatedPersonInput;
  startAt?: Date;
  endAt?: Date;
  isGuardian: boolean;
  contactPriority?: number;
  active: boolean;
}

export interface ValidatedPatientInput {
  nik?: string;
  fullName: string;
  birthDate: Date;
  gender: Gender;
  address?: string;
  phone?: string;
  active: boolean;
  birthPlaceText?: string;
  multipleBirthOrder?: number;
  deceasedAt?: Date;
  maritalStatusCode?: string;
  citizenshipCode?: string;
  identifiers: ValidatedPatientIdentifierInput[];
  names: ValidatedPatientNameInput[];
  telecoms: ValidatedPatientTelecomInput[];
  addresses: ValidatedPatientAddressInput[];
  relationships: ValidatedPatientRelationshipInput[];
}

export class PatientValidationError extends Error {
  constructor(readonly issues: PatientValidationIssue[]) {
    super('Data pasien tidak valid');
    this.name = 'PatientValidationError';
  }
}

const enumValues = <T extends string>(
  enumObject: Record<string, T>,
): readonly T[] => Object.values(enumObject);

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
};

const normalizeTextArray = (
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

const normalizePhone = (value: unknown): string | undefined => {
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

const parseDateOnly = (value: unknown): Date | undefined => {
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

const parseOptionalDateTime = (
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

const validatePeriod = (
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

const readEnum = <T extends string>(
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

const readBoolean = (
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

const readPositiveInteger = (
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

const readObjectArray = (
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

const validateIdentifiers = (
  value: unknown,
  issues: PatientValidationIssue[],
): ValidatedPatientIdentifierInput[] =>
  readObjectArray(value, 'identifiers', issues).flatMap((entry, index) => {
    const field = `identifiers[${index}]`;
    const type = readEnum(
      entry.type,
      enumValues(PatientIdentifierType),
      `${field}.type`,
      issues,
    );
    const system = normalizeOptionalText(entry.system);
    const displayValue = normalizeOptionalText(entry.value);
    if (!system) {
      issues.push({
        field: `${field}.system`,
        code: 'REQUIRED',
        message: 'Sistem identifier wajib diisi untuk identifier eksternal',
      });
    }
    if (!displayValue) {
      issues.push({
        field: `${field}.value`,
        code: 'REQUIRED',
        message: 'Nilai identifier wajib diisi',
      });
    }
    if (!type || !system || !displayValue) return [];

    const normalizedValue = normalizeIdentifierValue(type, displayValue);
    const isNik =
      type === PatientIdentifierType.NIK ||
      type === PatientIdentifierType.MOTHER_NIK;
    if (!normalizedValue || (isNik && !/^\d{16}$/.test(normalizedValue))) {
      issues.push({
        field: `${field}.value`,
        code: isNik ? 'INVALID_NIK_LENGTH' : 'INVALID_IDENTIFIER',
        message: isNik
          ? 'NIK harus terdiri dari tepat 16 digit'
          : 'Nilai identifier tidak valid',
      });
      return [];
    }

    const verificationStatus =
      entry.verificationStatus === undefined
        ? VerificationStatus.UNVERIFIED
        : readEnum(
            entry.verificationStatus,
            enumValues(VerificationStatus),
            `${field}.verificationStatus`,
            issues,
          );
    const validFrom = parseOptionalDateTime(
      entry.validFrom,
      `${field}.validFrom`,
      issues,
    );
    const validTo = parseOptionalDateTime(
      entry.validTo,
      `${field}.validTo`,
      issues,
    );
    validatePeriod(validFrom, validTo, `${field}.validTo`, issues);

    if (!verificationStatus) return [];
    return [
      {
        type,
        system,
        value: displayValue,
        normalizedValue,
        verificationStatus,
        isPrimary: readBoolean(
          entry.isPrimary,
          type === PatientIdentifierType.NIK,
          `${field}.isPrimary`,
          issues,
        ),
        active: readBoolean(entry.active, true, `${field}.active`, issues),
        issuer: normalizeOptionalText(entry.issuer),
        validFrom,
        validTo,
      },
    ];
  });

const validateNames = (
  value: unknown,
  issues: PatientValidationIssue[],
): ValidatedPatientNameInput[] =>
  readObjectArray(value, 'names', issues).flatMap((entry, index) => {
    const field = `names[${index}]`;
    const use = readEnum(
      entry.use,
      enumValues(PatientNameUse),
      `${field}.use`,
      issues,
    );
    const text = normalizeOptionalText(entry.text);
    if (!text || text.length > 255) {
      issues.push({
        field: `${field}.text`,
        code: text ? 'INVALID_LENGTH' : 'REQUIRED',
        message: 'Teks nama wajib diisi dan maksimal 255 karakter',
      });
    }
    const validFrom = parseOptionalDateTime(
      entry.validFrom,
      `${field}.validFrom`,
      issues,
    );
    const validTo = parseOptionalDateTime(
      entry.validTo,
      `${field}.validTo`,
      issues,
    );
    validatePeriod(validFrom, validTo, `${field}.validTo`, issues);
    if (!use || !text) return [];

    return [
      {
        use,
        text,
        given: normalizeTextArray(entry.given, `${field}.given`, issues),
        family: normalizeOptionalText(entry.family),
        prefix: normalizeTextArray(entry.prefix, `${field}.prefix`, issues),
        suffix: normalizeTextArray(entry.suffix, `${field}.suffix`, issues),
        validFrom,
        validTo,
      },
    ];
  });

const validateTelecoms = (
  value: unknown,
  issues: PatientValidationIssue[],
): ValidatedPatientTelecomInput[] =>
  readObjectArray(value, 'telecoms', issues).flatMap((entry, index) => {
    const field = `telecoms[${index}]`;
    const system = readEnum(
      entry.system,
      enumValues(TelecomSystem),
      `${field}.system`,
      issues,
    );
    const use = readEnum(
      entry.use,
      enumValues(TelecomUse),
      `${field}.use`,
      issues,
    );
    const displayValue = normalizeOptionalText(entry.value);
    if (!displayValue) {
      issues.push({
        field: `${field}.value`,
        code: 'REQUIRED',
        message: 'Nilai telecom wajib diisi',
      });
    }
    if (!system || !use || !displayValue) return [];

    let normalizedValue = displayValue;
    if (system === TelecomSystem.PHONE || system === TelecomSystem.FAX) {
      normalizedValue = normalizePhone(displayValue) ?? '';
      if (!/^(?:\+?[1-9]\d{7,14}|0\d{7,14})$/.test(normalizedValue)) {
        issues.push({
          field: `${field}.value`,
          code: 'INVALID_PHONE_FORMAT',
          message: 'Nomor telepon harus terdiri dari 8 sampai 15 digit',
        });
        return [];
      }
    } else if (system === TelecomSystem.EMAIL) {
      normalizedValue = displayValue.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)) {
        issues.push({
          field: `${field}.value`,
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Alamat email tidak valid',
        });
        return [];
      }
    } else {
      normalizedValue = displayValue.toUpperCase();
    }

    const verificationStatus =
      entry.verificationStatus === undefined
        ? VerificationStatus.UNVERIFIED
        : readEnum(
            entry.verificationStatus,
            enumValues(VerificationStatus),
            `${field}.verificationStatus`,
            issues,
          );
    const rank =
      entry.rank === undefined
        ? 1
        : readPositiveInteger(entry.rank, `${field}.rank`, issues);
    const validFrom = parseOptionalDateTime(
      entry.validFrom,
      `${field}.validFrom`,
      issues,
    );
    const validTo = parseOptionalDateTime(
      entry.validTo,
      `${field}.validTo`,
      issues,
    );
    validatePeriod(validFrom, validTo, `${field}.validTo`, issues);
    if (!verificationStatus || !rank) return [];

    return [
      {
        system,
        value: displayValue,
        normalizedValue,
        use,
        rank,
        verificationStatus,
        active: readBoolean(entry.active, true, `${field}.active`, issues),
        validFrom,
        validTo,
      },
    ];
  });

const validateAddresses = (
  value: unknown,
  issues: PatientValidationIssue[],
): ValidatedPatientAddressInput[] =>
  readObjectArray(value, 'addresses', issues).flatMap((entry, index) => {
    const field = `addresses[${index}]`;
    const use = readEnum(
      entry.use,
      enumValues(AddressUse),
      `${field}.use`,
      issues,
    );
    const type = readEnum(
      entry.type,
      enumValues(AddressType),
      `${field}.type`,
      issues,
    );
    const text = normalizeOptionalText(entry.text);
    const lines = normalizeTextArray(entry.lines, `${field}.lines`, issues);
    if (!text && lines.length === 0) {
      issues.push({
        field,
        code: 'ADDRESS_CONTENT_REQUIRED',
        message: 'Alamat membutuhkan text atau setidaknya satu line',
      });
    }

    const countryCode = normalizeOptionalText(entry.countryCode)?.toUpperCase();
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
      issues.push({
        field: `${field}.countryCode`,
        code: 'INVALID_COUNTRY_CODE',
        message: 'Kode negara harus berupa dua huruf ISO',
      });
    }
    const validFrom = parseOptionalDateTime(
      entry.validFrom,
      `${field}.validFrom`,
      issues,
    );
    const validTo = parseOptionalDateTime(
      entry.validTo,
      `${field}.validTo`,
      issues,
    );
    validatePeriod(validFrom, validTo, `${field}.validTo`, issues);
    if (!use || !type || (!text && lines.length === 0)) return [];

    return [
      {
        use,
        type,
        text,
        lines,
        postalCode: normalizeOptionalText(entry.postalCode),
        countryCode,
        provinceCode: normalizeOptionalText(entry.provinceCode),
        provinceName: normalizeOptionalText(entry.provinceName),
        regencyCode: normalizeOptionalText(entry.regencyCode),
        regencyName: normalizeOptionalText(entry.regencyName),
        districtCode: normalizeOptionalText(entry.districtCode),
        districtName: normalizeOptionalText(entry.districtName),
        villageCode: normalizeOptionalText(entry.villageCode),
        villageName: normalizeOptionalText(entry.villageName),
        active: readBoolean(entry.active, true, `${field}.active`, issues),
        validFrom,
        validTo,
      },
    ];
  });

const validateRelatedPerson = (
  value: Record<string, unknown>,
  field: string,
  issues: PatientValidationIssue[],
): ValidatedRelatedPersonInput | undefined => {
  const fullName = normalizeOptionalText(value.fullName);
  if (!fullName || fullName.length < 2 || fullName.length > 150) {
    issues.push({
      field: `${field}.fullName`,
      code: fullName ? 'INVALID_LENGTH' : 'REQUIRED',
      message: 'Nama related person wajib terdiri dari 2 sampai 150 karakter',
    });
  }
  const gender =
    value.gender === undefined
      ? undefined
      : readEnum(value.gender, enumValues(Gender), `${field}.gender`, issues);
  const birthDate =
    value.birthDate === undefined ? undefined : parseDateOnly(value.birthDate);
  if (value.birthDate !== undefined && !birthDate) {
    issues.push({
      field: `${field}.birthDate`,
      code: 'INVALID_DATE',
      message: 'Tanggal lahir related person harus memakai YYYY-MM-DD',
    });
  }
  const phone =
    value.phone === undefined ? undefined : normalizePhone(value.phone);
  if (
    value.phone !== undefined &&
    (!phone || !/^(?:\+?[1-9]\d{7,14}|0\d{7,14})$/.test(phone))
  ) {
    issues.push({
      field: `${field}.phone`,
      code: 'INVALID_PHONE_FORMAT',
      message: 'Nomor telepon related person tidak valid',
    });
  }
  const email = normalizeOptionalText(value.email)?.toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({
      field: `${field}.email`,
      code: 'INVALID_EMAIL_FORMAT',
      message: 'Email related person tidak valid',
    });
  }
  if (!fullName) return undefined;

  return {
    fullName,
    gender,
    birthDate,
    phone,
    email,
    addressText: normalizeOptionalText(value.addressText),
  };
};

const validateRelationships = (
  value: unknown,
  issues: PatientValidationIssue[],
): ValidatedPatientRelationshipInput[] =>
  readObjectArray(value, 'relationships', issues).flatMap((entry, index) => {
    const field = `relationships[${index}]`;
    const relationshipCode = readEnum(
      entry.relationshipCode,
      enumValues(PatientRelationshipCode),
      `${field}.relationshipCode`,
      issues,
    );
    const relatedPatientId = normalizeOptionalText(entry.relatedPatientId);
    const relatedPersonId = normalizeOptionalText(entry.relatedPersonId);
    const relatedPersonValue =
      typeof entry.relatedPerson === 'object' &&
      entry.relatedPerson !== null &&
      !Array.isArray(entry.relatedPerson)
        ? (entry.relatedPerson as Record<string, unknown>)
        : undefined;
    if (entry.relatedPerson !== undefined && !relatedPersonValue) {
      issues.push({
        field: `${field}.relatedPerson`,
        code: 'INVALID_TYPE',
        message: 'relatedPerson harus berupa object',
      });
    }

    const targetCount = [
      Boolean(relatedPatientId),
      Boolean(relatedPersonId || relatedPersonValue),
    ].filter(Boolean).length;
    if (targetCount !== 1) {
      issues.push({
        field,
        code: 'RELATIONSHIP_TARGET_REQUIRED',
        message:
          'Relasi harus memiliki tepat satu target Patient atau related person',
      });
    }
    const relatedPerson = relatedPersonValue
      ? validateRelatedPerson(
          relatedPersonValue,
          `${field}.relatedPerson`,
          issues,
        )
      : undefined;
    const startAt = parseOptionalDateTime(
      entry.startAt,
      `${field}.startAt`,
      issues,
    );
    const endAt = parseOptionalDateTime(entry.endAt, `${field}.endAt`, issues);
    validatePeriod(startAt, endAt, `${field}.endAt`, issues);
    const contactPriority =
      entry.contactPriority === undefined
        ? undefined
        : readPositiveInteger(
            entry.contactPriority,
            `${field}.contactPriority`,
            issues,
          );
    if (!relationshipCode || targetCount !== 1) return [];

    return [
      {
        relationshipCode,
        relatedPatientId,
        relatedPersonId,
        relatedPerson,
        startAt,
        endAt,
        isGuardian: readBoolean(
          entry.isGuardian,
          relationshipCode === PatientRelationshipCode.GUARDIAN,
          `${field}.isGuardian`,
          issues,
        ),
        contactPriority,
        active: readBoolean(entry.active, true, `${field}.active`, issues),
      },
    ];
  });

export const validatePatientInput = (
  input: unknown,
  now = new Date(),
): ValidatedPatientInput => {
  const body =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const issues: PatientValidationIssue[] = [];

  let nik = normalizeNik(body.nik);
  if (body.nik !== undefined && body.nik !== null && nik === '') {
    issues.push({
      field: 'nik',
      code: 'INVALID_NIK_FORMAT',
      message: 'NIK harus berupa string berisi 16 digit',
    });
  } else if (nik && !/^\d{16}$/.test(nik)) {
    issues.push({
      field: 'nik',
      code: 'INVALID_NIK_LENGTH',
      message: 'NIK harus terdiri dari tepat 16 digit',
    });
  }

  const fullName = normalizeOptionalText(body.fullName);
  if (!fullName) {
    issues.push({
      field: 'fullName',
      code: 'REQUIRED',
      message: 'Nama lengkap wajib diisi',
    });
  } else if (fullName.length < 2 || fullName.length > 150) {
    issues.push({
      field: 'fullName',
      code: 'INVALID_LENGTH',
      message: 'Nama lengkap harus terdiri dari 2 sampai 150 karakter',
    });
  } else if (
    Array.from(fullName).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    issues.push({
      field: 'fullName',
      code: 'INVALID_CHARACTERS',
      message: 'Nama lengkap mengandung karakter yang tidak didukung',
    });
  }

  const birthDate = parseDateOnly(body.birthDate);
  if (!birthDate) {
    issues.push({
      field: 'birthDate',
      code: 'INVALID_DATE',
      message: 'Tanggal lahir wajib memakai format YYYY-MM-DD yang valid',
    });
  } else {
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    if (birthDate > today) {
      issues.push({
        field: 'birthDate',
        code: 'FUTURE_DATE',
        message: 'Tanggal lahir tidak boleh berada di masa depan',
      });
    }
  }

  const gender = readEnum(body.gender, enumValues(Gender), 'gender', issues);
  const address = normalizeOptionalText(body.address);
  if (body.address !== undefined && body.address !== null && address === '') {
    issues.push({
      field: 'address',
      code: 'INVALID_TYPE',
      message: 'Alamat harus berupa teks',
    });
  } else if (address && address.length > 500) {
    issues.push({
      field: 'address',
      code: 'INVALID_LENGTH',
      message: 'Alamat tidak boleh melebihi 500 karakter',
    });
  }

  const phone = normalizePhone(body.phone);
  if (body.phone !== undefined && body.phone !== null && phone === '') {
    issues.push({
      field: 'phone',
      code: 'INVALID_PHONE_FORMAT',
      message: 'Nomor telepon mengandung karakter yang tidak didukung',
    });
  } else if (phone && !/^(?:\+?[1-9]\d{7,14}|0\d{7,14})$/.test(phone)) {
    issues.push({
      field: 'phone',
      code: 'INVALID_PHONE_FORMAT',
      message: 'Nomor telepon harus terdiri dari 8 sampai 15 digit',
    });
  }

  const identifiers = validateIdentifiers(body.identifiers, issues);
  const names = validateNames(body.names, issues);
  const telecoms = validateTelecoms(body.telecoms, issues);
  const addresses = validateAddresses(body.addresses, issues);
  const relationships = validateRelationships(body.relationships, issues);

  const activeNikIdentifiers = identifiers.filter(
    (identifier) =>
      identifier.type === PatientIdentifierType.NIK && identifier.active,
  );
  if (activeNikIdentifiers.length > 1) {
    issues.push({
      field: 'identifiers',
      code: 'MULTIPLE_ACTIVE_NIK',
      message: 'Pasien hanya boleh memiliki satu NIK aktif',
    });
  }
  activeNikIdentifiers.forEach((identifier, index) => {
    if (!identifier.isPrimary) {
      issues.push({
        field: `identifiers[${index}].isPrimary`,
        code: 'ACTIVE_NIK_MUST_BE_PRIMARY',
        message: 'NIK aktif harus menjadi identifier utama',
      });
    }
  });
  const activePrimaryByType = new Set<PatientIdentifierType>();
  identifiers.forEach((identifier, index) => {
    if (!identifier.active || !identifier.isPrimary) return;
    if (activePrimaryByType.has(identifier.type)) {
      issues.push({
        field: `identifiers[${index}].isPrimary`,
        code: 'MULTIPLE_PRIMARY_IDENTIFIERS',
        message:
          'Hanya satu identifier utama aktif yang diperbolehkan untuk setiap jenis',
      });
    }
    activePrimaryByType.add(identifier.type);
  });

  const structuredNik = activeNikIdentifiers[0]?.normalizedValue;
  if (nik && structuredNik && nik !== structuredNik) {
    issues.push({
      field: 'identifiers',
      code: 'LEGACY_NIK_MISMATCH',
      message: 'NIK legacy dan identifier NIK aktif harus sama',
    });
  } else if (!nik && structuredNik) {
    nik = structuredNik;
  } else if (
    nik &&
    !identifiers.some(
      (identifier) =>
        identifier.type === PatientIdentifierType.NIK &&
        identifier.normalizedValue === nik &&
        identifier.active,
    )
  ) {
    identifiers.unshift({
      type: PatientIdentifierType.NIK,
      system: 'urn:id:nik',
      value: nik,
      normalizedValue: nik,
      verificationStatus: VerificationStatus.UNVERIFIED,
      isPrimary: true,
      active: true,
    });
  }

  const officialNames = names.filter(
    (name) => name.use === PatientNameUse.OFFICIAL && !name.validTo,
  );
  if (officialNames.length > 1) {
    issues.push({
      field: 'names',
      code: 'MULTIPLE_CURRENT_OFFICIAL_NAMES',
      message: 'Pasien hanya boleh memiliki satu nama resmi saat ini',
    });
  }
  if (fullName && officialNames[0] && officialNames[0].text !== fullName) {
    issues.push({
      field: 'names',
      code: 'LEGACY_OFFICIAL_NAME_MISMATCH',
      message: 'fullName dan nama OFFICIAL saat ini harus sama',
    });
  } else if (
    fullName &&
    !names.some(
      (name) => name.use === PatientNameUse.OFFICIAL && name.text === fullName,
    )
  ) {
    names.unshift({
      use: PatientNameUse.OFFICIAL,
      text: fullName,
      given: [],
      prefix: [],
      suffix: [],
    });
  }

  if (
    phone &&
    !telecoms.some(
      (telecom) =>
        telecom.system === TelecomSystem.PHONE &&
        telecom.normalizedValue === phone &&
        telecom.active,
    )
  ) {
    telecoms.unshift({
      system: TelecomSystem.PHONE,
      value: phone,
      normalizedValue: phone,
      use: TelecomUse.MOBILE,
      rank: 1,
      verificationStatus: VerificationStatus.UNVERIFIED,
      active: true,
    });
  }

  if (
    address &&
    !addresses.some(
      (structuredAddress) =>
        structuredAddress.text === address && structuredAddress.active,
    )
  ) {
    addresses.unshift({
      use: AddressUse.HOME,
      type: AddressType.PHYSICAL,
      text: address,
      lines: [],
      countryCode: 'ID',
      active: true,
    });
  }

  const birthPlaceText = normalizeOptionalText(body.birthPlaceText);
  const multipleBirthOrder =
    body.multipleBirthOrder === undefined
      ? undefined
      : readPositiveInteger(
          body.multipleBirthOrder,
          'multipleBirthOrder',
          issues,
        );
  const deceasedAt = parseOptionalDateTime(
    body.deceasedAt,
    'deceasedAt',
    issues,
  );
  const citizenshipCode = normalizeOptionalText(
    body.citizenshipCode,
  )?.toUpperCase();
  if (citizenshipCode && !/^[A-Z]{3}$/.test(citizenshipCode)) {
    issues.push({
      field: 'citizenshipCode',
      code: 'INVALID_COUNTRY_CODE',
      message: 'Kode kewarganegaraan harus berupa tiga huruf ISO',
    });
  }
  const active = readBoolean(body.active, true, 'active', issues);

  if (issues.length > 0) {
    throw new PatientValidationError(issues);
  }

  return {
    nik,
    fullName: fullName!,
    birthDate: birthDate!,
    gender: gender!,
    address,
    phone,
    active,
    birthPlaceText,
    multipleBirthOrder,
    deceasedAt,
    maritalStatusCode: normalizeOptionalText(body.maritalStatusCode),
    citizenshipCode,
    identifiers,
    names,
    telecoms,
    addresses,
    relationships,
  };
};
