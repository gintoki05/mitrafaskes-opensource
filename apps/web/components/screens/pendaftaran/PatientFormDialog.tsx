'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type {
  CreatePatientDto,
  Patient,
  SatusehatPatientLookupQuery,
  SatusehatPatientRemoteSummary,
  SatusehatPatientSearchResponse,
} from '@mitrafaskes/shared';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { PatientContactFields } from './PatientContactFields';
import { PatientIdentityFields } from './PatientIdentityFields';
import { PatientRelationshipFields } from './PatientRelationshipFields';
import { PatientSatusehatLookupPanel } from './PatientSatusehatLookupPanel';
import { toPatientDraftPrefill } from './patientSatusehatPrefill';
import {
  patientFormDefaults,
  patientFormSchema,
  type PatientFormValues,
} from './patient-form-schema';
import {
  patientFormValuesFromPatient,
  patientFormValuesToPayload,
} from './patient-form-mappers';
import type { MaritalStatusLookupState } from './useMaritalStatuses';

type PatientFormDialogProps = {
  open: boolean;
  patient: Patient | null;
  canWrite: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePatientDto, patient: Patient | null) => Promise<Patient>;
  onSaved: () => void | Promise<void>;
  maritalStatusLookup: MaritalStatusLookupState;
  lookupSatusehat: (
    query: SatusehatPatientLookupQuery,
  ) => Promise<SatusehatPatientSearchResponse>;
};

export function PatientFormDialog({
  open,
  patient,
  canWrite,
  onClose,
  onSubmit,
  onSaved,
  maritalStatusLookup,
  lookupSatusehat,
}: PatientFormDialogProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: patient ? patientFormValuesFromPatient(patient) : patientFormDefaults,
    mode: 'onBlur',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = form;
  const currentNik = useWatch({ control, name: 'nik' });

  useEffect(() => {
    if (!open) return;
    reset(patient ? patientFormValuesFromPatient(patient) : patientFormDefaults);
  }, [open, patient, reset]);

  if (!open) return null;

  const isEditing = Boolean(patient);
  const applySatusehatData = (remote: SatusehatPatientRemoteSummary) => {
    const prefill = toPatientDraftPrefill(remote);
    if (prefill.fullName !== undefined) {
      setValue('fullName', prefill.fullName, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (prefill.nik !== undefined) {
      setValue('nik', prefill.nik, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (prefill.birthDate !== undefined) {
      setValue('birthDate', prefill.birthDate, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (prefill.gender !== undefined) {
      setValue('gender', prefill.gender, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (prefill.active !== undefined) {
      setValue('active', prefill.active, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    toast.success('Data SATUSEHAT sudah dimasukkan ke form.', {
      description: `${remote.name} · Nomor IHS ${remote.externalResourceId}`,
    });
  };

  const submit = handleSubmit(async (values) => {
    if (!canWrite) return;
    try {
      await onSubmit(patientFormValuesToPayload(values, patient), patient);
      toast.success(isEditing ? 'Data pasien berhasil diperbarui.' : 'Data pasien berhasil disimpan.');
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(isEditing ? 'Data pasien belum diperbarui' : 'Data pasien belum tersimpan', {
        description:
          error instanceof Error
            ? error.message
            : 'Data pasien tidak dapat disimpan.',
        duration: 7000,
      });
    }
  });

  return (
    <MasterFaskesDialog
      open
      label={isEditing ? `Edit pasien ${patient?.fullName ?? ''}` : 'Daftarkan pasien baru'}
      onClose={onClose}
      className="max-w-4xl"
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            {isEditing ? 'Edit data pasien lokal' : 'Daftarkan pasien baru'}
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Penyimpanan lokal tidak memanggil SATUSEHAT. Sinkronisasi dilakukan melalui aksi terpisah setelah data diperiksa.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={submit} className="space-y-4" noValidate>
            {!isEditing ? (
              <PatientSatusehatLookupPanel
                nik={currentNik}
                disabled={!canWrite || isSubmitting}
                lookupSatusehat={lookupSatusehat}
                onNikChange={(value) =>
                  setValue('nik', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onApply={applySatusehatData}
              />
            ) : null}
            <PatientIdentityFields
              control={control}
              errors={errors}
              register={register}
              disabled={!canWrite || isSubmitting}
              maritalStatusLookup={maritalStatusLookup}
            />
            <PatientContactFields
              errors={errors}
              register={register}
              disabled={!canWrite || isSubmitting}
            />
            <PatientRelationshipFields
              control={control}
              errors={errors}
              register={register}
              disabled={!canWrite || isSubmitting}
            />
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              {canWrite ? (
                <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan perubahan' : 'Simpan pasien'}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
