import {
  AddressType,
  AddressUse,
  Gender,
  PatientIdentifierType,
  PatientNameUse,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
} from '@mitrafaskes/shared';
import {
  normalizeNik,
  normalizeOptionalText,
  normalizePhone,
  parseDateOnly,
  parseOptionalDateTime,
  readBoolean,
  readEnum,
  readPositiveInteger,
  enumValues,
} from './patient.validation.helpers';
import {
  validateAddresses,
  validateIdentifiers,
  validateNames,
  validateRelationships,
  validateTelecoms,
} from './patient.validation.rules';
import {
  PatientValidationError,
  type PatientValidationIssue,
  type ValidatedPatientInput,
} from './patient.validation.types';

export * from './patient.validation.types';
export {
  normalizeIdentifierValue,
  normalizeNik,
} from './patient.validation.helpers';

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

  const gender = enumValues(Gender);
  const normalizedGender = readEnum(body.gender, gender, 'gender', issues);
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
    gender: normalizedGender!,
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
