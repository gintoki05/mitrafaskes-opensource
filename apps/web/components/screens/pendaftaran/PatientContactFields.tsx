'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
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
      <details className="group rounded-[var(--radius-card)] border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Identifier & SATUSEHAT</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Opsional</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
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
              placeholder="Diisi dari lookup atau linkage"
              aria-invalid={Boolean(errors.satusehatId)}
            />
            <p className="text-[11px] text-muted-foreground">Terisi otomatis dari SATUSEHAT.</p>
            <FieldError errors={[errors.satusehatId]} />
          </Field>
        </div>
      </details>

      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold">Kontak & alamat</CardTitle>
          <p className="text-xs text-muted-foreground">
            Telepon, email, dan alamat pasien.
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
