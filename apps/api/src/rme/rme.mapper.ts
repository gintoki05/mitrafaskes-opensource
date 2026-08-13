import { Prisma } from '@prisma/client';
import {
  AllergyReviewStatus,
  MEDICAL_RECORD_VALIDATION_PROFILE,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
  OutpatientDisposition,
  type MedicalRecord,
} from '@mitrafaskes/shared';

export const medicalRecordInclude = {
  diagnoses: { include: { icd10: true } },
  prescriptions: true,
} satisfies Prisma.MedicalRecordInclude;

export type MedicalRecordWithRelations = Prisma.MedicalRecordGetPayload<{
  include: typeof medicalRecordInclude;
}>;

export function toMedicalRecord(record: MedicalRecordWithRelations): MedicalRecord {
  if (
    record.serviceProfile !== MedicalRecordServiceProfile.OUTPATIENT_GENERAL ||
    record.validationProfile !==
      MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL]
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
    validationProfile:
      MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL],
    chiefComplaint: record.chiefComplaint ?? undefined,
    presentIllness: record.presentIllness ?? undefined,
    allergyReviewStatus:
      (record.allergyReviewStatus as AllergyReviewStatus | null) ?? undefined,
    allergyDetails: record.allergyDetails ?? undefined,
    physicalExam: record.physicalExam ?? undefined,
    education: record.education ?? undefined,
    carePlan: record.carePlan ?? undefined,
    disposition:
      (record.disposition as OutpatientDisposition | null) ?? undefined,
    anamnesis: record.anamnesis ?? undefined,
    systolic: record.systolic ?? undefined,
    diastolic: record.diastolic ?? undefined,
    heartRate: record.heartRate ?? undefined,
    temperature: record.temperature ?? undefined,
    weight: record.weight ?? undefined,
    height: record.height ?? undefined,
    diagnoses: record.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      icd10Code: diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
      icd10: diagnosis.icd10
        ? {
            code: diagnosis.icd10.code,
            display: diagnosis.icd10.display,
            nameIndo: diagnosis.icd10.nameIndo ?? undefined,
            nameEng: diagnosis.icd10.nameEng,
          }
        : undefined,
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
