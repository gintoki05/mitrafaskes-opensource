import type { ResourceIntegrationSummary } from "./integrations";
import type { TriageStatus } from "./encounter";

export interface MasterIcd10 {
  code: string;
  display: string;
  nameIndo?: string;
  nameEng: string;
}

export enum ClinicalHistoryCategory {
  PAST_MEDICAL = "PAST_MEDICAL",
  FAMILY = "FAMILY",
  MEDICATION = "MEDICATION",
  RISK = "RISK",
}

export enum ClinicalHistoryStatus {
  ACTIVE = "ACTIVE",
  RESOLVED = "RESOLVED",
  UNKNOWN = "UNKNOWN",
}

export interface ClinicalHistoryEntryDto {
  /** Existing child ID is echoed by the client so draft edits stay scoped. */
  id?: string;
  category: ClinicalHistoryCategory;
  text: string;
  status?: ClinicalHistoryStatus;
  onset?: string;
  note?: string;
}

export interface ClinicalHistoryEntry {
  id: string;
  category: ClinicalHistoryCategory;
  text: string;
  status?: ClinicalHistoryStatus;
  onset?: string;
  note?: string;
}

export interface DiagnosisDto {
  /** Existing child ID is echoed by the client so draft edits preserve linkage scope. */
  id?: string;
  icd10Code: string;
  isPrimary: boolean;
  notes?: string;
}

export type ClinicalObservationValueType =
  "quantity" | "code" | "boolean" | "string";

export type ClinicalObservationStatus =
  | "preliminary"
  | "final"
  | "amended"
  | "corrected"
  | "cancelled"
  | "entered-in-error"
  | "unknown";

export type ClinicalObservationProvenance = "original" | "derived";

export interface ClinicalObservationCode {
  system?: string;
  code: string;
  display?: string;
}

export interface ClinicalObservationQuantityValue {
  type: "quantity";
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface ClinicalObservationCodeValue {
  type: "code";
  coding: ClinicalObservationCode[];
  text?: string;
}

export interface ClinicalObservationBooleanValue {
  type: "boolean";
  value: boolean;
}

export interface ClinicalObservationStringValue {
  type: "string";
  value: string;
}

export type ClinicalObservationValue =
  | ClinicalObservationQuantityValue
  | ClinicalObservationCodeValue
  | ClinicalObservationBooleanValue
  | ClinicalObservationStringValue;

export interface ClinicalObservationReferenceRange {
  low?: number;
  high?: number;
}

export interface ClinicalObservationInterpretation {
  code: string;
  display?: string;
}

export interface ClinicalObservationDto {
  /** Existing child ID is echoed by the client so provider linkage stays per item. */
  id?: string;
  category?: string;
  code: ClinicalObservationCode | string;
  value: ClinicalObservationValue;
  effectiveAt?: string;
  performerId?: string;
  status?: ClinicalObservationStatus;
  provenance?: ClinicalObservationProvenance;
  derivedFromObservationIds?: string[];
  referenceRange?: ClinicalObservationReferenceRange;
  interpretation?: ClinicalObservationInterpretation;
}

export interface ClinicalObservation {
  id: string;
  category: string;
  code: ClinicalObservationCode;
  value: ClinicalObservationValue;
  effectiveAt: string;
  performerId?: string;
  status: ClinicalObservationStatus;
  provenance: ClinicalObservationProvenance;
  derivedFromObservationIds: string[];
  referenceRange?: ClinicalObservationReferenceRange;
  interpretation?: ClinicalObservationInterpretation;
  integrations?: ResourceIntegrationSummary[];
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
  DRAFT = "DRAFT",
  FINAL = "FINAL",
}

export enum MedicalRecordServiceProfile {
  OUTPATIENT_GENERAL = 'OUTPATIENT_GENERAL',
}

export enum AllergyReviewStatus {
  KNOWN = "KNOWN",
  NONE_KNOWN = "NONE_KNOWN",
  NOT_REVIEWED = "NOT_REVIEWED",
}

export enum OutpatientDisposition {
  HOME = "HOME",
  REFERRED = "REFERRED",
  ADMITTED = "ADMITTED",
  OTHER = "OTHER",
}

export const OUTPATIENT_GENERAL_VALIDATION_PROFILE =
  "OUTPATIENT_GENERAL_V1" as const;

export const MEDICAL_RECORD_VALIDATION_PROFILE = {
  [MedicalRecordServiceProfile.OUTPATIENT_GENERAL]:
    OUTPATIENT_GENERAL_VALIDATION_PROFILE,
} as const;

export type MedicalRecordValidationProfile =
  (typeof MEDICAL_RECORD_VALIDATION_PROFILE)[MedicalRecordServiceProfile];

export type RmeValidationSection =
  | "profile"
  | "encounter"
  | "anamnesis"
  | "allergies"
  | "vitalSigns"
  | "physicalExam"
  | "diagnoses"
  | "prescriptions"
  | "plan"
  | "authorization";

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
  triageStatus?: TriageStatus;
  triageUpdatedBy?: string;
  triageUpdatedAt?: string;
  triageCompletedBy?: string;
  triageCompletedByName?: string;
  triageCompletedAt?: string;
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
  histories: ClinicalHistoryEntry[];
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  observations: ClinicalObservation[];
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

export interface RmeAuditItem {
  id: string;
  action: string;
  actorUsername: string;
  actorRole: string;
  revision: number;
  occurredAt: string;
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
  histories?: ClinicalHistoryEntryDto[];
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  observations?: ClinicalObservationDto[];
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

export interface SaveTriageDraftDto {
  encounterId: string;
  expectedVersion: number;
  chiefComplaint?: string;
  presentIllness?: string;
  allergyReviewStatus?: AllergyReviewStatus;
  allergyDetails?: string;
  anamnesis?: string;
  histories?: ClinicalHistoryEntryDto[];
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  observations?: ClinicalObservationDto[];
}

export interface CompleteTriageDto {
  encounterId: string;
  expectedVersion: number;
  idempotencyKey: string;
}
