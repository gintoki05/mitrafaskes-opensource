'use client';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectField } from '../master-faskes/FormField';
import type { PatientFormValues } from './patient-form-schema';

type PatientRelationshipFieldsProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  disabled: boolean;
};

export function PatientRelationshipFields({
  control,
  errors,
  register,
  disabled,
}: PatientRelationshipFieldsProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-bold">Relasi pasien (opsional)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Form MVP mendukung satu relasi utama; relasi lain yang sudah ada tetap dipertahankan saat edit.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="relationshipCode"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="patient-relationship-code">Jenis relasi</FieldLabel>
              <SelectField
                id="patient-relationship-code"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
              >
                <option value="">Belum diisi</option>
                <option value="MOTHER">Ibu</option>
                <option value="FATHER">Ayah</option>
                <option value="CHILD">Anak</option>
                <option value="GUARDIAN">Wali</option>
                <option value="CAREGIVER">Pendamping</option>
                <option value="OTHER">Lainnya</option>
              </SelectField>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={control}
          name="relationshipTarget"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="patient-relationship-target">Target relasi</FieldLabel>
              <SelectField
                id="patient-relationship-target"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              >
                <option value="">Belum diisi</option>
                <option value="PERSON">Related person</option>
                <option value="PATIENT">Patient lain</option>
              </SelectField>
            </Field>
          )}
        />

        <Field className="sm:col-span-2" data-invalid={Boolean(errors.relatedPatientId)}>
          <FieldLabel htmlFor="patient-related-patient-id">
            ID Patient lokal terkait
          </FieldLabel>
          <Input
            id="patient-related-patient-id"
            {...register('relatedPatientId')}
            disabled={disabled}
            placeholder="Isi bila targetnya Patient lain"
            aria-invalid={Boolean(errors.relatedPatientId)}
          />
          <FieldError errors={[errors.relatedPatientId]} />
        </Field>

        <Field className="sm:col-span-2" data-invalid={Boolean(errors.relatedPersonName)}>
          <FieldLabel htmlFor="patient-related-person-name">Nama related person</FieldLabel>
          <Input
            id="patient-related-person-name"
            {...register('relatedPersonName')}
            disabled={disabled}
            placeholder="Nama wali/pendamping non-Patient"
            aria-invalid={Boolean(errors.relatedPersonName)}
          />
          <FieldError errors={[errors.relatedPersonName]} />
        </Field>

        <Controller
          control={control}
          name="relatedPersonGender"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="patient-related-person-gender">Gender related person</FieldLabel>
              <SelectField
                id="patient-related-person-gender"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              >
                <option value="">Belum diisi</option>
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
              </SelectField>
            </Field>
          )}
        />
        <Field>
          <FieldLabel htmlFor="patient-related-person-birth-date">Tanggal lahir related person</FieldLabel>
          <Input
            id="patient-related-person-birth-date"
            {...register('relatedPersonBirthDate')}
            type="date"
            disabled={disabled}
          />
        </Field>
        <Field data-invalid={Boolean(errors.relatedPersonPhone)}>
          <FieldLabel htmlFor="patient-related-person-phone">Telepon related person</FieldLabel>
          <Input
            id="patient-related-person-phone"
            {...register('relatedPersonPhone')}
            disabled={disabled}
            inputMode="tel"
            aria-invalid={Boolean(errors.relatedPersonPhone)}
          />
          <FieldError errors={[errors.relatedPersonPhone]} />
        </Field>
        <Field data-invalid={Boolean(errors.relatedPersonEmail)}>
          <FieldLabel htmlFor="patient-related-person-email">Email related person</FieldLabel>
          <Input
            id="patient-related-person-email"
            {...register('relatedPersonEmail')}
            disabled={disabled}
            type="email"
            aria-invalid={Boolean(errors.relatedPersonEmail)}
          />
          <FieldError errors={[errors.relatedPersonEmail]} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="patient-related-person-address">Alamat related person</FieldLabel>
          <Input
            id="patient-related-person-address"
            {...register('relatedPersonAddress')}
            disabled={disabled}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
