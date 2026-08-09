'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { ScreenState } from '@/components/ScreenState';
import type { Encounter, Icd10Entry } from '@/lib/clinical-types';
import { RmeDiagnosisSection } from './RmeDiagnosisSection';
import { RmePatientBanner } from './RmePatientBanner';
import { RmePrescriptionSection } from './RmePrescriptionSection';
import { RmeVitalSigns } from './RmeVitalSigns';
import { rmeFormSchema, type RmeFormValues } from './rme-form-schema';
import type { RmePrescriptionField, RmePresetBundle } from './types';

type RmeFormProps = {
  encounter: Encounter;
  icdSearch: string;
  icdResults: Icd10Entry[];
  saving: boolean;
  onSubmit: (values: RmeFormValues) => Promise<void>;
  onIcdSearchChange: (value: string) => void;
};

const defaultRmeValues: RmeFormValues = {
  anamnesis: 'Pasien mengeluh demam dan batuk sejak 2 hari yang lalu.',
  systolic: '120',
  diastolic: '80',
  heartRate: '78',
  temperature: '37.2',
  diagnoses: [
    { icd10Code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', isPrimary: true },
  ],
  prescriptions: [
    { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
    { medicineName: 'Amoxicillin 500mg', dosage: '1 Kaplet', frequency: '3x Sehari sesudah makan', quantity: 15 },
  ],
};

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
  icdSearch,
  icdResults,
  saving,
  onSubmit,
  onIcdSearchChange,
}: RmeFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    setValue,
    handleSubmit,
  } = useForm<RmeFormValues>({
    resolver: zodResolver(rmeFormSchema),
    defaultValues: defaultRmeValues,
    mode: 'onBlur',
  });
  const { append, replace } = useFieldArray({ control, name: 'prescriptions' });
  const systolic = useWatch({ control, name: 'systolic' });
  const diastolic = useWatch({ control, name: 'diastolic' });
  const heartRate = useWatch({ control, name: 'heartRate' });
  const temperature = useWatch({ control, name: 'temperature' });
  const diagnoses = useWatch({ control, name: 'diagnoses' }) ?? [];
  const prescriptions = useWatch({ control, name: 'prescriptions' }) ?? [];

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

  const submit = handleSubmit(onSubmit);

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <RmePatientBanner encounter={encounter} />

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
            dosage: '1 Tablet',
            frequency: '3x Sehari',
            quantity: 10,
          })
        }
        onUpdatePrescription={handleUpdatePrescription}
        onApplyPresetBundle={handleApplyPresetBundle}
      />

      <Button
        id="btn-save-rme"
        type="submit"
        disabled={saving || isSubmitting}
        className="w-full rounded-[var(--radius-panel)] bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/85"
      >
        <CheckCircle className="mr-2 h-5 w-5 stroke-[2.5]" />
        {saving || isSubmitting ? 'Menyimpan & Mensinkronkan...' : 'Simpan Rekam Medis (RME) & Sinkronkan ke SATUSEHAT'}
      </Button>
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
