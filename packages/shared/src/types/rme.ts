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

export interface MedicalRecord {
  id: string;
  encounterId: string;
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
    satusehatConditionId?: string;
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
}

export interface SaveMedicalRecordDto {
  encounterId: string;
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
