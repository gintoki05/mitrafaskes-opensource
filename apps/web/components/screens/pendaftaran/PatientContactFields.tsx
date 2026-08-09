'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { PatientFormValues } from './patient-form-schema';
import { PatientRegionFields } from './PatientRegionFields';
import type { PatientWilayahLookupState } from './usePatientWilayahLookup';

type PatientContactFieldsProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  setValue: UseFormSetValue<PatientFormValues>;
  disabled: boolean;
  wilayahLookup: PatientWilayahLookupState;
};

export function PatientContactFields({
  control,
  errors,
  register,
  setValue,
  disabled,
  wilayahLookup,
}: PatientContactFieldsProps) {
  return (
    <>
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold">Identifier & SATUSEHAT</CardTitle>
          <p className="text-xs text-muted-foreground">
            Identifier lokal tetap dipisahkan dari ID resource SATUSEHAT.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="patient-passport">Paspor</FieldLabel>
            <Input
              id="patient-passport"
              {...register('passport')}
              disabled={disabled}
              placeholder="Nomor paspor"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-family-card">Kartu keluarga</FieldLabel>
            <Input
              id="patient-family-card"
              {...register('familyCard')}
              disabled={disabled}
              placeholder="Nomor KK"
            />
          </Field>
          <Field className="sm:col-span-2" data-invalid={Boolean(errors.satusehatId)}>
            <FieldLabel htmlFor="patient-satusehat-id">Nomor IHS / SATUSEHAT ID</FieldLabel>
            <Input
              id="patient-satusehat-id"
              {...register('satusehatId')}
              disabled={disabled}
              readOnly
              className="font-mono"
              placeholder="Diisi dari hasil lookup atau linkage SATUSEHAT"
              aria-invalid={Boolean(errors.satusehatId)}
            />
            <p className="text-[11px] text-muted-foreground">
              Diisi otomatis dari hasil lookup atau linkage SATUSEHAT.
            </p>
            <FieldError errors={[errors.satusehatId]} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold">Kontak & alamat</CardTitle>
          <p className="text-xs text-muted-foreground">
            Alamat disimpan sebagai struktur terpisah tanpa menghilangkan teks display legacy.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.phone)}>
            <FieldLabel htmlFor="patient-phone">Telepon</FieldLabel>
            <Input
              id="patient-phone"
              {...register('phone')}
              disabled={disabled}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              aria-invalid={Boolean(errors.phone)}
            />
            <FieldError errors={[errors.phone]} />
          </Field>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="patient-email">Email</FieldLabel>
            <Input
              id="patient-email"
              {...register('email')}
              disabled={disabled}
              type="email"
              placeholder="nama@contoh.id"
              aria-invalid={Boolean(errors.email)}
            />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field className="sm:col-span-2" data-invalid={Boolean(errors.addressText)}>
            <FieldLabel htmlFor="patient-address">Alamat display</FieldLabel>
            <Input
              id="patient-address"
              {...register('addressText')}
              disabled={disabled}
              placeholder="Jalan, nomor rumah, RT/RW"
              aria-invalid={Boolean(errors.addressText)}
            />
            <FieldError errors={[errors.addressText]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-postal-code">Kode pos</FieldLabel>
            <Input
              id="patient-postal-code"
              {...register('postalCode')}
              disabled={disabled}
              inputMode="numeric"
              placeholder="Kode pos"
            />
          </Field>
          <PatientRegionFields
            control={control}
            errors={errors}
            register={register}
            setValue={setValue}
            disabled={disabled}
            lookup={wilayahLookup}
          />
        </CardContent>
      </Card>
    </>
  );
}
