'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { PatientFormValues } from './patient-form-schema';

type PatientContactFieldsProps = {
  errors: FieldErrors<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  disabled: boolean;
};

export function PatientContactFields({
  errors,
  register,
  disabled,
}: PatientContactFieldsProps) {
  return (
    <>
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-bold">Identifier tambahan</CardTitle>
          <p className="text-xs text-muted-foreground">
            Isi hanya identifier yang memang tersedia; namespace disimpan bersama nilainya.
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
          <Field data-invalid={Boolean(errors.otherIdentifierSystem)}>
            <FieldLabel htmlFor="patient-other-identifier-system">
              Namespace lain
            </FieldLabel>
            <Input
              id="patient-other-identifier-system"
              {...register('otherIdentifierSystem')}
              disabled={disabled}
              placeholder="Contoh: urn:id:asuransi"
              aria-invalid={Boolean(errors.otherIdentifierSystem)}
            />
            <FieldError errors={[errors.otherIdentifierSystem]} />
          </Field>
          <Field data-invalid={Boolean(errors.otherIdentifierValue)}>
            <FieldLabel htmlFor="patient-other-identifier-value">
              Nilai identifier lain
            </FieldLabel>
            <Input
              id="patient-other-identifier-value"
              {...register('otherIdentifierValue')}
              disabled={disabled}
              placeholder="Nomor/kode identifier"
              aria-invalid={Boolean(errors.otherIdentifierValue)}
            />
            <FieldError errors={[errors.otherIdentifierValue]} />
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
          <Field>
            <FieldLabel htmlFor="patient-province-name">Provinsi</FieldLabel>
            <Input
              id="patient-province-name"
              {...register('provinceName')}
              disabled={disabled}
              placeholder="Nama provinsi"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-regency-name">Kabupaten/kota</FieldLabel>
            <Input
              id="patient-regency-name"
              {...register('regencyName')}
              disabled={disabled}
              placeholder="Nama kabupaten/kota"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-district-name">Kecamatan</FieldLabel>
            <Input
              id="patient-district-name"
              {...register('districtName')}
              disabled={disabled}
              placeholder="Nama kecamatan"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="patient-village-name">Desa/kelurahan</FieldLabel>
            <Input
              id="patient-village-name"
              {...register('villageName')}
              disabled={disabled}
              placeholder="Nama desa/kelurahan"
            />
          </Field>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="patient-province-code">Kode provinsi</FieldLabel>
              <Input id="patient-province-code" {...register('provinceCode')} disabled={disabled} />
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-regency-code">Kode kab/kota</FieldLabel>
              <Input id="patient-regency-code" {...register('regencyCode')} disabled={disabled} />
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-district-code">Kode kecamatan</FieldLabel>
              <Input id="patient-district-code" {...register('districtCode')} disabled={disabled} />
            </Field>
            <Field>
              <FieldLabel htmlFor="patient-village-code">Kode desa</FieldLabel>
              <Input id="patient-village-code" {...register('villageCode')} disabled={disabled} />
            </Field>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
