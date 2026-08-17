'use client';

import { useState } from 'react';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectField } from '../master-faskes/FormField';
import { PatientMaritalStatusField } from './PatientMaritalStatusField';
import type { PatientFormValues } from './patient-form-schema';
import type { MaritalStatusLookupState } from './useMaritalStatuses';

type PatientIdentityFieldsProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  disabled: boolean;
  maritalStatusLookup: MaritalStatusLookupState;
};

export function PatientIdentityFields({
  control,
  errors,
  register,
  disabled,
  maritalStatusLookup,
}: PatientIdentityFieldsProps) {
  const values = useWatch({ control });
  const hasAdditionalData = Boolean(
    values.motherNik ||
      values.preferredName ||
      values.aliasName ||
      values.birthPlaceText ||
      values.maritalStatusCode ||
      (values.citizenshipCode && values.citizenshipCode !== 'IDN'),
  );
  const [additionalOpen, setAdditionalOpen] = useState(() => hasAdditionalData);
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-bold">Identitas utama</CardTitle>
        <p className="text-xs text-muted-foreground">
          Nama, NIK, tanggal lahir, dan jenis kelamin.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.fullName)} className="sm:col-span-2">
          <FieldLabel htmlFor="patient-full-name" required>
            Nama resmi
          </FieldLabel>
          <Input
            id="patient-full-name"
            {...register('fullName')}
            disabled={disabled}
            placeholder="Nama sesuai identitas resmi"
            aria-invalid={Boolean(errors.fullName)}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>

        <Field data-invalid={Boolean(errors.nik)}>
          <FieldLabel htmlFor="patient-nik">NIK</FieldLabel>
          <Input
            id="patient-nik"
            {...register('nik')}
            disabled={disabled}
            inputMode="numeric"
            maxLength={16}
            placeholder="16 digit NIK"
            className="font-mono"
            aria-invalid={Boolean(errors.nik)}
          />
          <FieldError errors={[errors.nik]} />
        </Field>

        <Field data-invalid={Boolean(errors.birthDate)}>
          <FieldLabel htmlFor="patient-birth-date" required>
            Tanggal lahir
          </FieldLabel>
          <Input
            id="patient-birth-date"
            {...register('birthDate')}
            type="date"
            disabled={disabled}
            aria-invalid={Boolean(errors.birthDate)}
          />
          <FieldError errors={[errors.birthDate]} />
        </Field>

        <Controller
          control={control}
          name="gender"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="patient-gender" required>
                Jenis kelamin
              </FieldLabel>
              <SelectField
                id="patient-gender"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
              >
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
              </SelectField>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <details
          className="group sm:col-span-2 rounded-[var(--radius-card)] border border-border bg-muted/20"
          open={additionalOpen}
          onToggle={(event) => setAdditionalOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-foreground">Data tambahan</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Opsional untuk pendaftaran awal</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-border p-3 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.motherNik)}>
              <FieldLabel htmlFor="patient-mother-nik">NIK ibu (bayi)</FieldLabel>
              <Input
                id="patient-mother-nik"
                {...register('motherNik')}
                disabled={disabled}
                inputMode="numeric"
                maxLength={16}
                placeholder="16 digit NIK"
                className="font-mono"
                aria-invalid={Boolean(errors.motherNik)}
              />
              <FieldError errors={[errors.motherNik]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="patient-preferred-name">Nama panggilan</FieldLabel>
              <Input
                id="patient-preferred-name"
                {...register('preferredName')}
                disabled={disabled}
                placeholder="Nama pilihan"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="patient-alias-name">Nama alias</FieldLabel>
              <Input
                id="patient-alias-name"
                {...register('aliasName')}
                disabled={disabled}
                placeholder="Nama lain"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="patient-birth-place">Tempat lahir</FieldLabel>
              <Input
                id="patient-birth-place"
                {...register('birthPlaceText')}
                disabled={disabled}
                placeholder="Kota/kabupaten"
              />
            </Field>

            <PatientMaritalStatusField
              control={control}
              errors={errors}
              disabled={disabled}
              lookup={maritalStatusLookup}
            />

            <Field data-invalid={Boolean(errors.citizenshipCode)}>
              <FieldLabel htmlFor="patient-citizenship">Kewarganegaraan</FieldLabel>
              <Input
                id="patient-citizenship"
                {...register('citizenshipCode')}
                disabled={disabled}
                maxLength={3}
                placeholder="IDN"
                className="uppercase"
                aria-invalid={Boolean(errors.citizenshipCode)}
              />
              <FieldError errors={[errors.citizenshipCode]} />
            </Field>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
