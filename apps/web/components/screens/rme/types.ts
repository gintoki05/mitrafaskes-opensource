import type { ResourceIntegrationSummary } from "@mitrafaskes/shared";

export type RmeDiagnosis = {
  id?: string;
  icd10Code: string;
  nameIndo: string;
  isPrimary: boolean;
  integrations?: ResourceIntegrationSummary[];
};

export type RmePrescription = {
  medicineName: string;
  kfaCode?: string;
  dosage: string;
  frequency: string;
  quantity: number;
  instructions?: string;
};

export type RmePresetBundle = "ISPA" | "GASTRITIS" | "HYPERTENSION";

export type RmePrescriptionField =
  | "medicineName"
  | "kfaCode"
  | "dosage"
  | "frequency"
  | "quantity"
  | "instructions";
