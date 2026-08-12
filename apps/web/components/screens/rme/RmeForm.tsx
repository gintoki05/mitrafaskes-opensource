'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FileText } from 'lucide-react';
import { MedicalRecordStatus, type MedicalRecord } from '@mitrafaskes/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { ScreenState } from '@/components/ScreenState';
import type { Encounter, Icd10Entry } from '@/lib/clinical-types';
import { RmeDiagnosisSection } from './RmeDiagnosisSection';
import { RmePatientBanner } from './RmePatientBanner';
import { RmePrescriptionSection } from './RmePrescriptionSection';
import { RmeVitalSigns } from './RmeVitalSigns';
import {
  emptyRmeFormValues,
  rmeFormSchema,
  type RmeFormValues,
} from './rme-form-schema';
import type { RmePrescriptionField, RmePresetBundle } from './types';
import type { RmeMutationState } from '@/hooks/useRmeLifecycle';
import {
  RmeLifecycleActions,
  RmeLifecycleSummary,
} from './RmeLifecycleControls';

type RmeFormProps = {
  encounter: Encounter;
  record: MedicalRecord | null;
  icdSearch: string;
  icdResults: Icd10Entry[];
  mutationState: RmeMutationState;
  canSaveDraft: boolean;
  canFinalize: boolean;
  onSaveDraft: (values: RmeFormValues) => Promise<void>;
  onFinalize: () => Promise<void>;
  onIcdSearchChange: (value: string) => void;
};

function formValuesFrom(record: MedicalRecord | null): RmeFormValues {
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

function presetValues(type: RmePresetBundle): Pick<RmeFormValues, 'diagnoses' | 'prescriptions'> {
  if (type === 'ISPA') {
    return {
      diagnoses: [
        { icd10Code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', isPrimary: true },
      ],
      prescriptions: [
        { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'CTM 4mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'Vitamin C 50mg', dosage: '1 Tablet', frequency: '2x Sehari sesudah makan', quantity: 10 },
      ],
    };
  }

  if (type === 'GASTRITIS') {
    return {
      diagnoses: [
        { icd10Code: 'K29.7', nameIndo: 'Gastritis, Tidak Spesifik (Sakit Maag)', isPrimary: true },
      ],
      prescriptions: [
        { medicineName: 'Antasida Doen', dosage: '1 Tablet Kunyah', frequency: '3x Sehari sebelum makan', quantity: 12 },
        { medicineName: 'Omeprazole 20mg', dosage: '1 Kapsul', frequency: '2x Sehari sebelum makan', quantity: 10 },
      ],
    };
  }

  return {
    diagnoses: [
      { icd10Code: 'I10', nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)', isPrimary: true },
    ],
    prescriptions: [
      { medicineName: 'Amlodipine 5mg', dosage: '1 Tablet', frequency: '1x Sehari pagi hari', quantity: 30 },
    ],
  };
}

export function RmeForm({
  encounter,
  record,
  icdSearch,
  icdResults,
  mutationState,
  canSaveDraft,
  canFinalize,
  onSaveDraft,
  onFinalize,
  onIcdSearchChange,
}: RmeFormProps) {
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    register,
    reset,
    setValue,
    handleSubmit,
  } = useForm<RmeFormValues>({
    resolver: zodResolver(rmeFormSchema),
    defaultValues: emptyRmeFormValues(),
    mode: 'onBlur',
  });
  const { append, replace } = useFieldArray({ control, name: 'prescriptions' });
  const systolic = useWatch({ control, name: 'systolic' });
  const diastolic = useWatch({ control, name: 'diastolic' });
  const heartRate = useWatch({ control, name: 'heartRate' });
  const temperature = useWatch({ control, name: 'temperature' });
  const diagnoses = useWatch({ control, name: 'diagnoses' }) ?? [];
  const prescriptions = useWatch({ control, name: 'prescriptions' }) ?? [];
  const readOnly = record?.status === MedicalRecordStatus.FINAL;
  const busy = mutationState === 'saving-draft' || mutationState === 'finalizing';

  useEffect(() => {
    reset(formValuesFrom(record));
  }, [record, reset]);

  const updateStringValue = (
    field: 'systolic' | 'diastolic' | 'temperature' | 'heartRate',
    value: string,
  ) => {
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
  };

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
    onIcdSearchChange('');
  };

  const handleRemoveDiagnosis = (code: string) => {
    updateDiagnoses(diagnoses.filter((diagnosis) => diagnosis.icd10Code !== code));
  };

  const handleUpdatePrescription = (
    index: number,
    field: RmePrescriptionField,
    value: string | number,
  ) => {
    if (field === 'quantity') {
      setValue(`prescriptions.${index}.quantity`, Number(value) || 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    setValue(`prescriptions.${index}.${field}`, String(value), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleApplyPresetBundle = (type: RmePresetBundle) => {
    const values = presetValues(type);
    updateDiagnoses(values.diagnoses);
    replace(values.prescriptions);
  };

  const saveDraft = handleSubmit(onSaveDraft);

  return (
    <form onSubmit={saveDraft} className="space-y-6" noValidate>
      <RmePatientBanner encounter={encounter} />

      <RmeLifecycleSummary
        record={record}
        readOnly={readOnly}
        isDirty={isDirty}
        mutationState={mutationState}
      />

      <fieldset disabled={readOnly || busy} className="space-y-6">

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            1. Anamnesis & Keluhan Utama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field data-invalid={Boolean(errors.anamnesis)}>
            <FieldLabel htmlFor="anamnesis">Anamnesis dan keluhan utama</FieldLabel>
            <textarea
              {...register('anamnesis')}
              id="anamnesis"
              rows={3}
              className="clinical-field w-full p-3 text-xs"
              placeholder="Input keluhan utama, riwayat penyakit, alergi obat..."
              aria-invalid={Boolean(errors.anamnesis)}
              aria-describedby="anamnesis-error"
            />
            <FieldError id="anamnesis-error" errors={[errors.anamnesis]} />
          </Field>
        </CardContent>
      </Card>

      <RmeVitalSigns
        systolic={systolic}
        diastolic={diastolic}
        temperature={temperature}
        heartRate={heartRate}
        onChange={(field, value) => updateStringValue(field, value)}
      />
      <RmeDiagnosisSection
        icdSearch={icdSearch}
        icdResults={icdResults}
        selectedDiagnoses={diagnoses}
        onSearchChange={onIcdSearchChange}
        onAddDiagnosis={handleAddDiagnosis}
        onRemoveDiagnosis={handleRemoveDiagnosis}
      />
      <RmePrescriptionSection
        prescriptions={prescriptions}
        onAddPrescription={() =>
          append({
            medicineName: '',
            dosage: '',
            frequency: '',
            quantity: 0,
          })
        }
        onUpdatePrescription={handleUpdatePrescription}
        onApplyPresetBundle={handleApplyPresetBundle}
      />

      </fieldset>

      <RmeLifecycleActions
        record={record}
        readOnly={readOnly}
        isDirty={isDirty}
        mutationState={mutationState}
        busy={busy}
        isSubmitting={isSubmitting}
        canSaveDraft={canSaveDraft}
        canFinalize={canFinalize}
        onFinalize={onFinalize}
      />
    </form>
  );
}

export function RmeFormPlaceholder({ encountersLoading }: { encountersLoading: boolean }) {
  return (
    <ScreenState
      kind={encountersLoading ? 'loading' : 'empty'}
      title={encountersLoading ? 'Menyiapkan ruang kerja RME' : 'Belum ada pasien yang dipilih'}
      description={encountersLoading ? 'Antrean pasien sedang dimuat.' : 'Pilih antrean pasien untuk mulai mengisi rekam medis.'}
    />
  );
}
