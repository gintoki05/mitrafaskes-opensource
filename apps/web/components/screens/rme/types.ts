export type RmeDiagnosis = {
  icd10Code: string;
  nameIndo: string;
  isPrimary: boolean;
};

export type RmePrescription = {
  medicineName: string;
  dosage: string;
  frequency: string;
  quantity: number;
};

export type RmePresetBundle = 'ISPA' | 'GASTRITIS' | 'HYPERTENSION';

export type RmePrescriptionField =
  | 'medicineName'
  | 'dosage'
  | 'frequency'
  | 'quantity';
