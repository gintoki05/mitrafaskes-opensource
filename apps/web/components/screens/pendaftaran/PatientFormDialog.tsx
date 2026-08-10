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
import { usePatientWilayahLookup } from './usePatientWilayahLookup';
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
import { PatientStatusField } from './PatientStatusField';

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
  const provinceCode = useWatch({ control, name: 'provinceCode' });
  const regencyCode = useWatch({ control, name: 'regencyCode' });
  const districtCode = useWatch({ control, name: 'districtCode' });
  const wilayahLookup = usePatientWilayahLookup({
    enabled: open,
    provinceCode,
    regencyCode,
    districtCode,
  });

  useEffect(() => {
    if (!open) return;
    reset(patient ? patientFormValuesFromPatient(patient) : patientFormDefaults);
  }, [open, patient, reset]);

  if (!open) return null;

  const isEditing = Boolean(patient);
  const applySatusehatData = (remote: SatusehatPatientRemoteSummary) => {
    const prefill = toPatientDraftPrefill(remote);
    if (prefill.satusehatId !== undefined) {
      setValue('satusehatId', prefill.satusehatId, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
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
      description: `${remote.name} · Nomor IHS / SATUSEHAT ID ${remote.externalResourceId}`,
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
        <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                {isEditing ? 'Edit data pasien' : 'Pasien baru'}
              </CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Isi kolom bertanda * terlebih dahulu. Data lain bisa dilengkapi nanti.
              </p>
            </div>
            <PatientStatusField control={control} disabled={!canWrite || isSubmitting} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-4 sm:px-6">
          <form onSubmit={submit} className="space-y-3" noValidate>
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
              control={control}
              errors={errors}
              register={register}
              setValue={setValue}
              disabled={!canWrite || isSubmitting}
              wilayahLookup={wilayahLookup}
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
