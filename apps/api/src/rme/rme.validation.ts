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
import type { ClinicalObservationStatus } from '@mitrafaskes/shared';
import type { RmeObservationDraft } from './rme.observation';

export type ValidatedMedicalRecordDraft = Omit<
  SaveMedicalRecordDraftDto,
  'diagnoses' | 'prescriptions' | 'observations'
> & {
  diagnoses: DiagnosisDto[];
  prescriptions: PrescriptionDto[];
  observations: RmeObservationDraft[];
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

function optionalDate(value: unknown, field: string): Date | undefined {
  const text = optionalString(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw validationError(`${field} harus berupa waktu ISO yang valid`);
  }
  return parsed;
}

function expectedVersion(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validationError(
      'expectedVersion harus berupa bilangan bulat non-negatif',
    );
  }
  return parsed;
}

function serviceProfile(value: unknown): MedicalRecordServiceProfile {
  if (
    value === undefined ||
    value === MedicalRecordServiceProfile.OUTPATIENT_GENERAL
  ) {
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
  if (typeof value === 'string' && values.includes(value as T))
    return value as T;
  throw validationError(`${field} tidak valid`);
}

function observationCode(value: unknown): {
  codeSystem?: string;
  code: string;
  codeDisplay?: string;
} {
  if (typeof value === 'string') {
    return { code: requiredString(value, 'observations.code') };
  }
  const code = recordOf(value);
  return {
    codeSystem: optionalString(code.system),
    code: requiredString(code.code, 'observations.code'),
    codeDisplay: optionalString(code.display),
  };
}

function observationStatus(value: unknown): ClinicalObservationStatus {
  return (
    optionalEnum(
      value,
      [
        'preliminary',
        'final',
        'amended',
        'corrected',
        'cancelled',
        'entered-in-error',
        'unknown',
      ] as const,
      'observations.status',
    ) ?? 'final'
  );
}

function observationValue(
  input: Record<string, unknown>,
  index: number,
): Pick<
  RmeObservationDraft,
  | 'valueType'
  | 'valueQuantityValue'
  | 'valueQuantityUnit'
  | 'valueQuantitySystem'
  | 'valueQuantityCode'
  | 'valueCodeSystem'
  | 'valueCode'
  | 'valueCodeDisplay'
  | 'valueBoolean'
  | 'valueString'
> {
  const rawValue = recordOf(input.value);
  const rawType = optionalString(
    input.valueType ?? rawValue.type,
  )?.toLowerCase();
  if (
    rawType === 'quantity' ||
    (rawValue.value !== undefined && rawValue.unit !== undefined)
  ) {
    const value = optionalNumber(
      rawValue.value ?? input.valueQuantityValue,
      `observations[${index}].value.value`,
    );
    if (value === undefined) {
      throw validationError(`observations[${index}].value.value wajib diisi`);
    }
    return {
      valueType: 'quantity',
      valueQuantityValue: value,
      valueQuantityUnit:
        optionalString(rawValue.unit ?? input.valueQuantityUnit) ?? '',
      valueQuantitySystem: optionalString(
        rawValue.system ?? input.valueQuantitySystem,
      ),
      valueQuantityCode: optionalString(
        rawValue.code ?? input.valueQuantityCode,
      ),
    };
  }

  if (rawType === 'code' || Array.isArray(rawValue.coding)) {
    const coding = Array.isArray(rawValue.coding)
      ? (rawValue.coding as unknown[])[0]
      : input.valueCode;
    const valueCode = recordOf(coding);
    const code = requiredString(
      valueCode.code ?? (typeof coding === 'string' ? coding : undefined),
      `observations[${index}].value.coding[0].code`,
    );
    return {
      valueType: 'code',
      valueCodeSystem: optionalString(
        valueCode.system ?? input.valueCodeSystem,
      ),
      valueCode: code,
      valueCodeDisplay: optionalString(
        valueCode.display ?? input.valueCodeDisplay,
      ),
    };
  }

  if (rawType === 'boolean' || typeof input.valueBoolean === 'boolean') {
    const value = rawValue.value ?? input.valueBoolean;
    if (typeof value !== 'boolean') {
      throw validationError(`observations[${index}].value.value harus boolean`);
    }
    return { valueType: 'boolean', valueBoolean: value };
  }

  if (
    rawType === 'string' ||
    typeof rawValue.value === 'string' ||
    typeof input.valueString === 'string'
  ) {
    const value = optionalString(rawValue.value ?? input.valueString);
    if (!value) {
      throw validationError(`observations[${index}].value.value wajib diisi`);
    }
    return { valueType: 'string', valueString: value };
  }

  throw validationError(
    `observations[${index}].value harus bertipe quantity, code, boolean, atau string`,
  );
}

function parseObservationDraft(
  value: unknown,
  index: number,
): RmeObservationDraft {
  const input = recordOf(value);
  const code = observationCode(input.code);
  const referenceRange = recordOf(input.referenceRange);
  const low = optionalNumber(
    referenceRange.low ?? input.referenceRangeLow,
    `observations[${index}].referenceRange.low`,
  );
  const high = optionalNumber(
    referenceRange.high ?? input.referenceRangeHigh,
    `observations[${index}].referenceRange.high`,
  );
  const interpretation = recordOf(input.interpretation);
  const interpretationCode = optionalString(
    interpretation.code ?? input.interpretationCode,
  );
  const derivedFromObservationIds = Array.isArray(
    input.derivedFromObservationIds,
  )
    ? input.derivedFromObservationIds.map((id, sourceIndex) =>
        requiredString(
          id,
          `observations[${index}].derivedFromObservationIds[${sourceIndex}]`,
        ),
      )
    : [];

  return {
    id: optionalString(input.id),
    category: optionalString(input.category) ?? 'vital-signs',
    ...code,
    ...observationValue(input, index),
    effectiveAt: optionalDate(
      input.effectiveAt,
      `observations[${index}].effectiveAt`,
    ),
    performerId: optionalString(input.performerId),
    status: observationStatus(input.status),
    provenance: input.provenance === 'derived' ? 'derived' : 'original',
    derivedFromObservationIds,
    ...(low === undefined && high === undefined
      ? {}
      : { referenceRangeLow: low, referenceRangeHigh: high }),
    ...(interpretationCode
      ? {
          interpretationCode,
          interpretationDisplay: optionalString(
            interpretation.display ?? input.interpretationDisplay,
          ),
        }
      : {}),
  };
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
      throw validationError(
        'Jumlah resep harus berupa bilangan bulat non-negatif',
      );
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
  const observations = (
    Array.isArray(body.observations) ? body.observations : []
  ).map((observation, index) => parseObservationDraft(observation, index));

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
    observations,
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
