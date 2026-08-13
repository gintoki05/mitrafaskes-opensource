import { BadRequestException } from '@nestjs/common';
import {
  MEDICAL_RECORD_VALIDATION_PROFILE,
  MedicalRecordServiceProfile,
  OUTPATIENT_GENERAL_VALIDATION_PROFILE,
  type DiagnosisDto,
  type PrescriptionDto,
  type SaveMedicalRecordDraftDto,
} from '@mitrafaskes/shared';

export type ValidatedMedicalRecordDraft = Omit<
  SaveMedicalRecordDraftDto,
  'diagnoses' | 'prescriptions'
> & {
  diagnoses: DiagnosisDto[];
  prescriptions: PrescriptionDto[];
  serviceProfile: MedicalRecordServiceProfile;
  validationProfile: typeof OUTPATIENT_GENERAL_VALIDATION_PROFILE;
};

export type FinalizationValidationInput = {
  serviceProfile: string;
  validationProfile: string;
  anamnesis: string | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  diagnoses: Array<{ isPrimary: boolean }>;
  encounter: {
    patientId: string;
    doctorId: string;
    organizationId: string;
    locationId: string;
  };
};

const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : {};

function validationError(
  message: string,
  errors?: Array<{ field: string; message: string }>,
): BadRequestException {
  return new BadRequestException({
    code: 'RME_VALIDATION_FAILED',
    message,
    ...(errors ? { errors } : {}),
  });
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(`${field} wajib diisi`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw validationError(`${field} harus berupa angka`);
  }
  return parsed;
}

function expectedVersion(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError('expectedVersion harus berupa bilangan bulat non-negatif');
  }
  return parsed;
}

function serviceProfile(value: unknown): MedicalRecordServiceProfile {
  if (value === undefined || value === MedicalRecordServiceProfile.OUTPATIENT_GENERAL) {
    return MedicalRecordServiceProfile.OUTPATIENT_GENERAL;
  }
  throw validationError('Profil layanan RME tidak didukung.');
}

export function parseDraftInput(input: unknown): ValidatedMedicalRecordDraft {
  const body = recordOf(input);
  const selectedServiceProfile = serviceProfile(body.serviceProfile);
  const diagnoses = (Array.isArray(body.diagnoses) ? body.diagnoses : []).map(
    (diagnosis) => {
      const value = recordOf(diagnosis);
      return {
        icd10Code: requiredString(value.icd10Code, 'icd10Code'),
        isPrimary: value.isPrimary !== false,
        notes: optionalString(value.notes),
      };
    },
  );
  const prescriptions = (
    Array.isArray(body.prescriptions) ? body.prescriptions : []
  ).map((prescription) => {
    const value = recordOf(prescription);
    const quantity = Number(value.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw validationError('Jumlah resep harus berupa bilangan bulat positif');
    }
    return {
      medicineName: requiredString(value.medicineName, 'medicineName'),
      kfaCode: optionalString(value.kfaCode),
      dosage: requiredString(value.dosage, 'dosage'),
      frequency: requiredString(value.frequency, 'frequency'),
      quantity,
      instructions: optionalString(value.instructions),
    };
  });

  return {
    encounterId: requiredString(body.encounterId, 'encounterId'),
    expectedVersion: expectedVersion(body.expectedVersion),
    serviceProfile: selectedServiceProfile,
    validationProfile:
      MEDICAL_RECORD_VALIDATION_PROFILE[selectedServiceProfile],
    anamnesis: optionalString(body.anamnesis),
    systolic: optionalNumber(body.systolic, 'systolic'),
    diastolic: optionalNumber(body.diastolic, 'diastolic'),
    heartRate: optionalNumber(body.heartRate, 'heartRate'),
    temperature: optionalNumber(body.temperature, 'temperature'),
    weight: optionalNumber(body.weight, 'weight'),
    height: optionalNumber(body.height, 'height'),
    diagnoses,
    prescriptions,
  };
}

export function parseFinalizeInput(input: unknown): {
  encounterId: string;
  expectedVersion: number;
} {
  const body = recordOf(input);
  return {
    encounterId: requiredString(body.encounterId, 'encounterId'),
    expectedVersion: expectedVersion(body.expectedVersion),
  };
}

export function assertReadyForFinalization(
  record: FinalizationValidationInput,
): void {
  const errors: Array<{ field: string; message: string }> = [];
  if (
    record.serviceProfile !== MedicalRecordServiceProfile.OUTPATIENT_GENERAL ||
    record.validationProfile !==
      MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL]
  ) {
    errors.push({
      field: 'serviceProfile',
      message: 'Profil layanan dan validation profile RME tidak konsisten.',
    });
  }
  if (!record.encounter.patientId) {
    errors.push({ field: 'patientId', message: 'Pasien Encounter tidak tersedia.' });
  }
  if (!record.encounter.organizationId) {
    errors.push({ field: 'organizationId', message: 'Organisasi layanan tidak tersedia.' });
  }
  if (!record.encounter.locationId) {
    errors.push({ field: 'locationId', message: 'Lokasi layanan tidak tersedia.' });
  }
  if (!record.encounter.doctorId) {
    errors.push({ field: 'doctorId', message: 'Klinisi Encounter tidak tersedia.' });
  }
  if (!record.anamnesis?.trim()) {
    errors.push({ field: 'anamnesis', message: 'Anamnesis dan keluhan utama wajib diisi.' });
  }
  for (const [field, value, label] of [
    ['systolic', record.systolic, 'Tekanan darah sistolik'],
    ['diastolic', record.diastolic, 'Tekanan darah diastolik'],
    ['heartRate', record.heartRate, 'Denyut nadi'],
    ['temperature', record.temperature, 'Suhu tubuh'],
  ] as const) {
    if (value === null) errors.push({ field, message: `${label} wajib diisi.` });
  }
  const primaryCount = record.diagnoses.filter(
    (diagnosis) => diagnosis.isPrimary,
  ).length;
  if (primaryCount !== 1) {
    errors.push({
      field: 'diagnoses',
      message: 'RME final wajib mempunyai tepat satu diagnosis utama.',
    });
  }
  if (errors.length > 0) {
    throw validationError(
      'RME belum memenuhi validation profile OUTPATIENT_GENERAL_V1.',
      errors,
    );
  }
}
