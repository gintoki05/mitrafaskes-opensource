export interface MasterIcd10 {
  code: string;
  display: string;
  nameIndo?: string;
  nameEng: string;
}

export interface DiagnosisDto {
  icd10Code: string;
  isPrimary: boolean;
  notes?: string;
}

export interface PrescriptionDto {
  medicineName: string;
  kfaCode?: string;
  dosage: string;
  frequency: string;
  quantity: number;
  instructions?: string;
}

export enum MedicalRecordStatus {
  DRAFT = 'DRAFT',
  FINAL = 'FINAL',
}

export enum MedicalRecordServiceProfile {
  OUTPATIENT_GENERAL = 'OUTPATIENT_GENERAL',
}

export const OUTPATIENT_GENERAL_VALIDATION_PROFILE =
  'OUTPATIENT_GENERAL_V1' as const;

export const MEDICAL_RECORD_VALIDATION_PROFILE = {
  [MedicalRecordServiceProfile.OUTPATIENT_GENERAL]:
    OUTPATIENT_GENERAL_VALIDATION_PROFILE,
} as const;

export type MedicalRecordValidationProfile =
  (typeof MEDICAL_RECORD_VALIDATION_PROFILE)[MedicalRecordServiceProfile];

export interface MedicalRecord {
  id: string;
  encounterId: string;
  status: MedicalRecordStatus;
  version: number;
  serviceProfile: MedicalRecordServiceProfile;
  authoredBy?: string;
  authoredAt?: string;
  finalizedBy?: string;
  finalizedAt?: string;
  validationProfile: MedicalRecordValidationProfile;
  anamnesis?: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  diagnoses: {
    id: string;
    icd10Code: string;
    isPrimary: boolean;
    icd10?: MasterIcd10;
  }[];
  prescriptions: {
    id: string;
    medicineName: string;
    kfaCode?: string;
    dosage: string;
    frequency: string;
    quantity: number;
    instructions?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveMedicalRecordDraftDto {
  encounterId: string;
  expectedVersion: number;
  serviceProfile: MedicalRecordServiceProfile;
  anamnesis?: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  diagnoses: DiagnosisDto[];
  prescriptions: PrescriptionDto[];
}

export interface FinalizeMedicalRecordDto {
  encounterId: string;
  expectedVersion: number;
}
