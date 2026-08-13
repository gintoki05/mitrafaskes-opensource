import { Prisma } from '@prisma/client';
import {
  AllergyReviewStatus,
  MEDICAL_RECORD_VALIDATION_PROFILE,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
  OutpatientDisposition,
  type MedicalRecord,
  type ClinicalObservation,
  type ClinicalObservationProvenance,
  type ClinicalObservationStatus,
  type ResourceIntegrationSummary,
} from '@mitrafaskes/shared';

export const medicalRecordInclude = {
  diagnoses: true,
  prescriptions: true,
  observations: true,
} satisfies Prisma.MedicalRecordInclude;

export type MedicalRecordWithRelations = Prisma.MedicalRecordGetPayload<{
  include: typeof medicalRecordInclude;
}>;

export function toMedicalRecord(
  record: MedicalRecordWithRelations,
  conditionIntegrations: ReadonlyMap<string, ResourceIntegrationSummary[]> = new Map(),
  icd10ByCode: ReadonlyMap<string, Prisma.MasterIcd10GetPayload<Prisma.MasterIcd10DefaultArgs>> = new Map(),
  observationIntegrations: ReadonlyMap<string, ResourceIntegrationSummary[]> = new Map(),
): MedicalRecord {
  if (
    record.serviceProfile !== MedicalRecordServiceProfile.OUTPATIENT_GENERAL ||
    record.validationProfile !== MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL]
  ) {
    throw new Error('Konfigurasi profil layanan RME tidak konsisten');
  }
  return {
    id: record.id,
    encounterId: record.encounterId,
    status: record.status as MedicalRecordStatus,
    version: record.version,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    authoredBy: record.authoredBy ?? undefined,
    authoredAt: record.authoredAt?.toISOString(),
    finalizedBy: record.finalizedBy ?? undefined,
    finalizedAt: record.finalizedAt?.toISOString(),
    validationProfile: MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL],
    chiefComplaint: record.chiefComplaint ?? undefined,
    presentIllness: record.presentIllness ?? undefined,
    allergyReviewStatus: (record.allergyReviewStatus as AllergyReviewStatus | null) ?? undefined,
    allergyDetails: record.allergyDetails ?? undefined,
    physicalExam: record.physicalExam ?? undefined,
    education: record.education ?? undefined,
    carePlan: record.carePlan ?? undefined,
    disposition: (record.disposition as OutpatientDisposition | null) ?? undefined,
    anamnesis: record.anamnesis ?? undefined,
    systolic: record.systolic ?? undefined,
    diastolic: record.diastolic ?? undefined,
    heartRate: record.heartRate ?? undefined,
    temperature: record.temperature ?? undefined,
    weight: record.weight ?? undefined,
    height: record.height ?? undefined,
    observations: (record.observations ?? []).map((observation) =>
      toClinicalObservation(
        observation,
        observationIntegrations.get(observation.id) ?? [],
      ),
    ),
    diagnoses: record.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      icd10Code: diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
      integrations: conditionIntegrations.get(diagnosis.id) ?? [],
      icd10: (() => {
        const catalog = icd10ByCode.get(diagnosis.icd10Code);
        return catalog
        ? {
              code: catalog.code,
              display: catalog.display,
              nameIndo: catalog.nameIndo ?? undefined,
              nameEng: catalog.nameEng,
          }
          : undefined;
      })(),
    })),
    prescriptions: record.prescriptions.map((prescription) => ({
      id: prescription.id,
      medicineName: prescription.medicineName,
      kfaCode: prescription.kfaCode ?? undefined,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      quantity: prescription.quantity,
      instructions: prescription.instructions ?? undefined,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toClinicalObservation(
  observation: Prisma.ClinicalObservationGetPayload<Prisma.ClinicalObservationDefaultArgs>,
  integrations: ResourceIntegrationSummary[],
): ClinicalObservation {
  const value = observation.valueType === 'quantity'
    ? {
        type: 'quantity' as const,
        value: observation.valueQuantityValue ?? 0,
        unit: observation.valueQuantityUnit ?? '',
        ...(observation.valueQuantitySystem
          ? { system: observation.valueQuantitySystem }
          : {}),
        ...(observation.valueQuantityCode
          ? { code: observation.valueQuantityCode }
          : {}),
      }
    : observation.valueType === 'code'
      ? {
          type: 'code' as const,
          coding: [
            {
              ...(observation.valueCodeSystem
                ? { system: observation.valueCodeSystem }
                : {}),
              code: observation.valueCode ?? '',
              ...(observation.valueCodeDisplay
                ? { display: observation.valueCodeDisplay }
                : {}),
            },
          ],
        }
      : observation.valueType === 'boolean'
        ? { type: 'boolean' as const, value: observation.valueBoolean ?? false }
        : { type: 'string' as const, value: observation.valueString ?? '' };

  return {
    id: observation.id,
    category: observation.category,
    code: {
      ...(observation.codeSystem ? { system: observation.codeSystem } : {}),
      code: observation.code,
      ...(observation.codeDisplay ? { display: observation.codeDisplay } : {}),
    },
    value,
    effectiveAt: observation.effectiveAt.toISOString(),
    ...(observation.performerId ? { performerId: observation.performerId } : {}),
    status: observation.status as ClinicalObservationStatus,
    provenance: observation.provenance as ClinicalObservationProvenance,
    derivedFromObservationIds: observation.derivedFromObservationIds,
    ...(observation.referenceRangeLow !== null || observation.referenceRangeHigh !== null
      ? {
          referenceRange: {
            ...(observation.referenceRangeLow === null
              ? {}
              : { low: observation.referenceRangeLow }),
            ...(observation.referenceRangeHigh === null
              ? {}
              : { high: observation.referenceRangeHigh }),
          },
        }
      : {}),
    ...(observation.interpretationCode
      ? {
          interpretation: {
            code: observation.interpretationCode,
            ...(observation.interpretationDisplay
              ? { display: observation.interpretationDisplay }
              : {}),
          },
        }
      : {}),
    integrations,
  };
}
