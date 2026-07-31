import { CreatePatientDto, Gender } from '@mitrafaskes/shared';

export interface PatientValidationIssue {
  field: keyof CreatePatientDto;
  code: string;
  message: string;
}

export interface ValidatedPatientInput {
  nik?: string;
  fullName: string;
  birthDate: Date;
  gender: Gender;
  address?: string;
  phone?: string;
}

export class PatientValidationError extends Error {
  constructor(readonly issues: PatientValidationIssue[]) {
    super('Data pasien tidak valid');
    this.name = 'PatientValidationError';
  }
}

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
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

const parseBirthDate = (value: unknown): Date | undefined => {
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

export const validatePatientInput = (
  input: unknown,
  now = new Date(),
): ValidatedPatientInput => {
  const body =
    typeof input === 'object' && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const issues: PatientValidationIssue[] = [];

  const nik = normalizeNik(body.nik);
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
  } else if (/[\u0000-\u001f\u007f]/.test(fullName)) {
    issues.push({
      field: 'fullName',
      code: 'INVALID_CHARACTERS',
      message: 'Nama lengkap mengandung karakter yang tidak didukung',
    });
  }

  const birthDate = parseBirthDate(body.birthDate);
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

  const normalizedGender =
    typeof body.gender === 'string' ? body.gender.toUpperCase() : undefined;
  if (normalizedGender !== Gender.MALE && normalizedGender !== Gender.FEMALE) {
    issues.push({
      field: 'gender',
      code: 'INVALID_ENUM',
      message: 'Gender harus bernilai MALE atau FEMALE',
    });
  }

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

  if (issues.length > 0) {
    throw new PatientValidationError(issues);
  }

  return {
    nik,
    fullName: fullName!,
    birthDate: birthDate!,
    gender: normalizedGender as Gender,
    address,
    phone,
  };
};
