'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { MedicalRecord, RmeValidationIssue } from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScreenState } from '@/components/ScreenState';
import type { Icd10Entry } from '@/lib/clinical-types';
import { RmeDiagnosisSection } from './RmeDiagnosisSection';
import { RmeConflictNotice } from './RmeConflictNotice';
import { RmePrescriptionSection } from './RmePrescriptionSection';
import { RmeVitalSigns } from './RmeVitalSigns';
import {
  emptyRmeFormValues,
  rmeFormSchema,
  type RmeFormValues,
} from './rme-form-schema';
import { formValuesFrom } from './rme-form-mappers';
import { rmePresetValues } from './rme-presets';
import type { RmePrescriptionField, RmePresetBundle } from './types';
import type { RmeMutationState } from '@/hooks/useRmeLifecycle';
import { isRmeReadOnly, type RmeVersionConflict } from './rme-workspace-model';
import {
  RmeLifecycleActions,
  RmeLifecycleSummary,
} from './RmeLifecycleControls';
import {
  RmeAssessmentSections,
  RmePhysicalExamSection,
} from './RmeAssessmentSections';
import { RmeCarePlanSection } from './RmeCarePlanSection';
import { useRmeDiagnosisEditor } from './useRmeDiagnosisEditor';
import {
  RmeGlobalFinalizationIssues,
  RmeSectionIssues,
} from './RmeFinalizationIssues';

type RmeFormProps = {
  record: MedicalRecord | null;
  icdSearch: string;
  icdResults: Icd10Entry[];
  mutationState: RmeMutationState;
  canSaveDraft: boolean;
  canFinalize: boolean;
  conflict: RmeVersionConflict | null;
  finalizationIssues: RmeValidationIssue[];
  onSaveDraft: (values: RmeFormValues) => Promise<void>;
  onPreflight: () => Promise<boolean>;
  onFinalize: () => Promise<void>;
  onReload: () => void;
  onIcdSearchChange: (value: string) => void;
  canSyncDiagnosis: boolean;
  syncingDiagnosisId: string | null;
  onSyncDiagnosis: (id: string) => void;
};

export function RmeForm({
  record,
  icdSearch,
  icdResults,
  mutationState,
  canSaveDraft,
  canFinalize,
  conflict,
  finalizationIssues,
  onSaveDraft,
  onPreflight,
  onFinalize,
  onReload,
  onIcdSearchChange,
  canSyncDiagnosis,
  syncingDiagnosisId,
  onSyncDiagnosis,
}: RmeFormProps) {
  const {
    control,
    formState: { isDirty, isSubmitting },
    register,
    reset,
    setValue,
    getValues,
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
  const allergyReviewStatus = useWatch({
    control,
    name: 'allergyReviewStatus',
  });
  const disposition = useWatch({ control, name: 'disposition' });
  const prescriptions = useWatch({ control, name: 'prescriptions' }) ?? [];
  const {
    selectedDiagnoses,
    updateDiagnoses,
    handleAddDiagnosis,
    handleRemoveDiagnosis,
  } = useRmeDiagnosisEditor({
    control,
    setValue,
    record,
    onSearchChange: onIcdSearchChange,
  });
  const readOnly = isRmeReadOnly(record);
  const busy =
    mutationState === 'preflighting' ||
    mutationState === 'saving-draft' ||
    mutationState === 'finalizing';

  useEffect(() => {
    reset(formValuesFrom(record));
  }, [record, reset]);

  useEffect(() => {
    const firstIssue = finalizationIssues[0];
    if (!firstIssue) return;
    const section = document.querySelector<HTMLElement>(
      `[data-rme-section="${firstIssue.section}"]`,
    );
    section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    section?.focus({ preventScroll: true });
  }, [finalizationIssues]);

  const updateStringValue = (
    field: 'systolic' | 'diastolic' | 'temperature' | 'heartRate',
    value: string,
  ) => {
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
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
    const values = rmePresetValues(type);
    updateDiagnoses(values.diagnoses);
    replace(values.prescriptions);
  };

  const saveDraft = handleSubmit(onSaveDraft);

  const copyDraft = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard tidak tersedia');
      await navigator.clipboard.writeText(JSON.stringify(getValues(), null, 2));
      toast.success('Draft disalin', {
        description: 'Simpan salinan ini secara aman sebelum memuat versi server.',
      });
    } catch {
      toast.error('Draft tidak dapat disalin', {
        description: 'Salin isi form secara manual sebelum memuat versi terbaru.',
      });
    }
  };

  return (
    <form onSubmit={saveDraft} className="space-y-6" noValidate>
      <RmeLifecycleSummary
        record={record}
        readOnly={readOnly}
        isDirty={isDirty}
        mutationState={mutationState}
      />

      <RmeGlobalFinalizationIssues issues={finalizationIssues} />

      {conflict ? (
        <RmeConflictNotice
          conflict={conflict}
          localVersion={record?.version ?? 0}
          onCopyDraft={copyDraft}
          onReload={onReload}
        />
      ) : null}

      <fieldset disabled={readOnly || busy} className="space-y-6">
        <RmeAssessmentSections
          register={register}
          allergyReviewStatus={allergyReviewStatus}
          onAllergyReviewChange={(value) =>
            setValue('allergyReviewStatus', value, { shouldDirty: true })
          }
          issues={finalizationIssues}
        />

        <div data-rme-section="vitalSigns" tabIndex={-1}>
          <RmeVitalSigns
            systolic={systolic}
            diastolic={diastolic}
            temperature={temperature}
            heartRate={heartRate}
            onChange={(field, value) => updateStringValue(field, value)}
          />
          <RmeSectionIssues issues={finalizationIssues} section="vitalSigns" />
        </div>
        <RmePhysicalExamSection
          register={register}
          issues={finalizationIssues}
        />
      </fieldset>
      <div data-rme-section="diagnoses" tabIndex={-1}>
        <RmeDiagnosisSection
          icdSearch={icdSearch}
          icdResults={icdResults}
          selectedDiagnoses={selectedDiagnoses}
          onSearchChange={onIcdSearchChange}
          onAddDiagnosis={handleAddDiagnosis}
          onRemoveDiagnosis={handleRemoveDiagnosis}
          disabled={readOnly || busy}
          syncDisabled={isDirty || busy}
          syncDisabledReason={
            busy
              ? 'Tunggu proses RME selesai.'
              : 'Simpan perubahan lokal sebelum sinkronisasi.'
          }
          canSyncDiagnosis={canSyncDiagnosis}
          syncingDiagnosisId={syncingDiagnosisId}
          onSyncDiagnosis={onSyncDiagnosis}
        />
        <RmeSectionIssues issues={finalizationIssues} section="diagnoses" />
      </div>

      <fieldset disabled={readOnly || busy} className="space-y-6">
        <div data-rme-section="prescriptions" tabIndex={-1}>
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
          <RmeSectionIssues issues={finalizationIssues} section="prescriptions" />
        </div>
        <RmeCarePlanSection
          register={register}
          disposition={disposition}
          onDispositionChange={(value) =>
            setValue('disposition', value, { shouldDirty: true })
          }
          issues={finalizationIssues}
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
        onPreflight={onPreflight}
        onFinalize={onFinalize}
      />
    </form>
  );
}

export function RmeFormPlaceholder({
  encountersLoading,
  loadError = '',
  onRetry,
}: {
  encountersLoading: boolean;
  loadError?: string;
  onRetry?: () => void;
}) {
  if (loadError) {
    return (
      <ScreenState
        kind="error"
        title="Ruang kerja RME tidak tersedia"
        description={loadError}
        action={onRetry ? (
          <Button type="button" size="sm" onClick={onRetry}>Coba lagi</Button>
        ) : undefined}
      />
    );
  }
  return (
    <ScreenState
      kind={encountersLoading ? 'loading' : 'empty'}
      title={encountersLoading ? 'Menyiapkan ruang kerja RME' : 'Belum ada pasien yang dipilih'}
      description={encountersLoading ? 'Antrean pasien sedang dimuat.' : 'Pilih antrean pasien untuk mulai mengisi rekam medis.'}
    />
  );
}
