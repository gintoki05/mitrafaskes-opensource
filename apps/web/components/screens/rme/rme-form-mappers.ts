import type { MedicalRecord } from '@mitrafaskes/shared';
import { emptyRmeFormValues, type RmeFormValues } from './rme-form-schema.ts';

export function formValuesFrom(record: MedicalRecord | null): RmeFormValues {
  if (!record) return emptyRmeFormValues();
  return {
    anamnesis: record.anamnesis ?? '',
    systolic: record.systolic === undefined ? '' : String(record.systolic),
    diastolic: record.diastolic === undefined ? '' : String(record.diastolic),
    heartRate: record.heartRate === undefined ? '' : String(record.heartRate),
    temperature:
      record.temperature === undefined ? '' : String(record.temperature),
    diagnoses: record.diagnoses.map((diagnosis) => ({
      icd10Code: diagnosis.icd10Code,
      nameIndo:
        diagnosis.icd10?.nameIndo ??
        diagnosis.icd10?.display ??
        diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
    })),
    prescriptions: record.prescriptions.map((prescription) => ({
      medicineName: prescription.medicineName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      quantity: prescription.quantity,
    })),
  };
}
