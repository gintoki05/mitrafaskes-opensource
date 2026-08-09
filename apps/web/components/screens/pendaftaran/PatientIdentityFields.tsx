'use client';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
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
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-bold">Identitas & demografi</CardTitle>
        <p className="text-xs text-muted-foreground">
          Data utama disimpan lokal dan menjadi sumber model Patient terstruktur.
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

        <Field data-invalid={Boolean(errors.motherNik)}>
          <FieldLabel htmlFor="patient-mother-nik">NIK ibu (bayi)</FieldLabel>
          <Input
            id="patient-mother-nik"
            {...register('motherNik')}
            disabled={disabled}
            inputMode="numeric"
            maxLength={16}
            placeholder="Opsional, 16 digit"
            className="font-mono"
            aria-invalid={Boolean(errors.motherNik)}
          />
          <FieldError errors={[errors.motherNik]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="patient-preferred-name">Nama preferred</FieldLabel>
          <Input
            id="patient-preferred-name"
            {...register('preferredName')}
            disabled={disabled}
            placeholder="Nama panggilan resmi"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="patient-alias-name">Nama alias</FieldLabel>
          <Input
            id="patient-alias-name"
            {...register('aliasName')}
            disabled={disabled}
            placeholder="Nama lain bila diperlukan"
          />
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

        <Field>
          <FieldLabel htmlFor="patient-birth-place">Tempat lahir</FieldLabel>
          <Input
            id="patient-birth-place"
            {...register('birthPlaceText')}
            disabled={disabled}
            placeholder="Kota/kabupaten tempat lahir"
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

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="patient-active">Status lokal</FieldLabel>
              <SelectField
                id="patient-active"
                value={field.value ? 'true' : 'false'}
                onChange={(value) => field.onChange(value === 'true')}
                disabled={disabled}
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </SelectField>
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}
