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
import {
  enumValues,
  normalizeIdentifierValue,
  normalizeOptionalText,
  normalizePhone,
  normalizeTextArray,
  parseDateOnly,
  parseOptionalDateTime,
  readBoolean,
  readEnum,
  readObjectArray,
  readPositiveInteger,
  validatePeriod,
} from './patient.validation.helpers';
import type {
  PatientValidationIssue,
  ValidatedPatientAddressInput,
  ValidatedPatientIdentifierInput,
  ValidatedPatientNameInput,
  ValidatedPatientRelationshipInput,
  ValidatedPatientTelecomInput,
  ValidatedRelatedPersonInput,
} from './patient.validation.types';

export const validateIdentifiers = (
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

export const validateNames = (
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

export const validateTelecoms = (
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

export const validateAddresses = (
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

export const validateRelationships = (
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
