import type { ResourceIntegrationSummary } from './integrations';

export interface MasterIcd10 {
  code: string;
  display: string;
  nameIndo?: string;
  nameEng: string;
}

export interface DiagnosisDto {
  /** Existing child ID is echoed by the client so draft edits preserve linkage scope. */
  id?: string;
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

export enum AllergyReviewStatus {
  KNOWN = 'KNOWN',
  NONE_KNOWN = 'NONE_KNOWN',
  NOT_REVIEWED = 'NOT_REVIEWED',
}

export enum OutpatientDisposition {
  HOME = 'HOME',
  REFERRED = 'REFERRED',
  ADMITTED = 'ADMITTED',
  OTHER = 'OTHER',
}

export const OUTPATIENT_GENERAL_VALIDATION_PROFILE =
  'OUTPATIENT_GENERAL_V1' as const;

export const MEDICAL_RECORD_VALIDATION_PROFILE = {
  [MedicalRecordServiceProfile.OUTPATIENT_GENERAL]:
    OUTPATIENT_GENERAL_VALIDATION_PROFILE,
} as const;

export type MedicalRecordValidationProfile =
  (typeof MEDICAL_RECORD_VALIDATION_PROFILE)[MedicalRecordServiceProfile];

export type RmeValidationSection =
  | 'profile'
  | 'encounter'
  | 'anamnesis'
  | 'allergies'
  | 'vitalSigns'
  | 'physicalExam'
  | 'diagnoses'
  | 'prescriptions'
  | 'plan'
  | 'authorization';

export interface RmeValidationIssue {
  code: string;
  field: string;
  section: RmeValidationSection;
  message: string;
}

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
  chiefComplaint?: string;
  presentIllness?: string;
  allergyReviewStatus?: AllergyReviewStatus;
  allergyDetails?: string;
  physicalExam?: string;
  education?: string;
  carePlan?: string;
  disposition?: OutpatientDisposition;
  /** @deprecated Legacy combined narrative retained for read compatibility. */
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
    integrations?: ResourceIntegrationSummary[];
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
  chiefComplaint?: string;
  presentIllness?: string;
  allergyReviewStatus?: AllergyReviewStatus;
  allergyDetails?: string;
  physicalExam?: string;
  education?: string;
  carePlan?: string;
  disposition?: OutpatientDisposition;
  /** @deprecated Legacy combined narrative retained for compatibility. */
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
  idempotencyKey: string;
}

export interface PreflightMedicalRecordDto {
  encounterId: string;
  expectedVersion: number;
}

export interface RmePreflightResult {
  ready: boolean;
  serviceProfile: string;
  validationProfile: string;
  issues: RmeValidationIssue[];
}
