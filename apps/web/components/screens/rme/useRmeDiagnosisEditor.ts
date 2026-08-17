'use client';

import type { MedicalRecord } from '@mitrafaskes/shared';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import type { Icd10Entry } from '@/lib/clinical-types';
import type { RmeFormValues } from './rme-form-schema';
import type { RmeDiagnosis } from './types';

type UseRmeDiagnosisEditorInput = {
  control: Control<RmeFormValues>;
  setValue: UseFormSetValue<RmeFormValues>;
  record: MedicalRecord | null;
  onSearchChange: (value: string) => void;
};

export function useRmeDiagnosisEditor({
  control,
  setValue,
  record,
  onSearchChange,
}: UseRmeDiagnosisEditorInput) {
  const diagnoses = useWatch({ control, name: 'diagnoses' }) ?? [];
  const selectedDiagnoses: RmeDiagnosis[] = diagnoses.map((diagnosis) => {
    const persistedDiagnosis = record?.diagnoses.find((candidate) =>
      diagnosis.id
        ? candidate.id === diagnosis.id
        : candidate.icd10Code === diagnosis.icd10Code,
    );
    return {
      ...diagnosis,
      integrations: persistedDiagnosis?.integrations,
    };
  });

  const updateDiagnoses = (value: RmeFormValues['diagnoses']) => {
    setValue('diagnoses', value, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddDiagnosis = (icd: Icd10Entry) => {
    if (diagnoses.some((diagnosis) => diagnosis.icd10Code === icd.code)) return;
    updateDiagnoses([
      ...diagnoses,
      {
        icd10Code: icd.code,
        nameIndo: icd.nameIndo ?? icd.display,
        isPrimary: diagnoses.length === 0,
      },
    ]);
    onSearchChange('');
  };

  const handleRemoveDiagnosis = (code: string) => {
    updateDiagnoses(
      diagnoses.filter((diagnosis) => diagnosis.icd10Code !== code),
    );
  };

  return {
    diagnoses,
    selectedDiagnoses,
    updateDiagnoses,
    handleAddDiagnosis,
    handleRemoveDiagnosis,
  };
}
