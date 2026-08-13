import { BadRequestException } from '@nestjs/common';
import {
  AllergyReviewStatus,
  MEDICAL_RECORD_VALIDATION_PROFILE,
  MedicalRecordServiceProfile,
  OUTPATIENT_GENERAL_VALIDATION_PROFILE,
  OutpatientDisposition,
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

const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : {};

function validationError(message: string): BadRequestException {
  return new BadRequestException({ code: 'RME_VALIDATION_FAILED', message });
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

function optionalEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && values.includes(value as T)) return value as T;
  throw validationError(`${field} tidak valid`);
}

export function parseDraftInput(input: unknown): ValidatedMedicalRecordDraft {
  const body = recordOf(input);
  const selectedServiceProfile = serviceProfile(body.serviceProfile);
  const diagnoses = (Array.isArray(body.diagnoses) ? body.diagnoses : []).map(
    (diagnosis) => {
      const value = recordOf(diagnosis);
      const id = optionalString(value.id);
      return {
        ...(id ? { id } : {}),
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
    const quantity = Number(value.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw validationError('Jumlah resep harus berupa bilangan bulat non-negatif');
    }
    return {
      medicineName: optionalString(value.medicineName) ?? '',
      kfaCode: optionalString(value.kfaCode),
      dosage: optionalString(value.dosage) ?? '',
      frequency: optionalString(value.frequency) ?? '',
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
    chiefComplaint: optionalString(body.chiefComplaint),
    presentIllness: optionalString(body.presentIllness),
    allergyReviewStatus: optionalEnum(
      body.allergyReviewStatus,
      Object.values(AllergyReviewStatus),
      'allergyReviewStatus',
    ),
    allergyDetails: optionalString(body.allergyDetails),
    physicalExam: optionalString(body.physicalExam),
    education: optionalString(body.education),
    carePlan: optionalString(body.carePlan),
    disposition: optionalEnum(
      body.disposition,
      Object.values(OutpatientDisposition),
      'disposition',
    ),
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

export function parsePreflightInput(input: unknown): {
  encounterId: string;
  expectedVersion: number;
} {
  const body = recordOf(input);
  return {
    encounterId: requiredString(body.encounterId, 'encounterId'),
    expectedVersion: expectedVersion(body.expectedVersion),
  };
}

export function parseFinalizeInput(input: unknown): {
  encounterId: string;
  expectedVersion: number;
  idempotencyKey: string;
} {
  const body = recordOf(input);
  const idempotencyKey = requiredString(body.idempotencyKey, 'idempotencyKey');
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    throw validationError('idempotencyKey harus sepanjang 8-128 karakter aman');
  }
  return {
    encounterId: requiredString(body.encounterId, 'encounterId'),
    expectedVersion: expectedVersion(body.expectedVersion),
    idempotencyKey,
  };
}
