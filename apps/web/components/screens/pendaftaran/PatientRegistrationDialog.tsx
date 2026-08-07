'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  patientRegistrationDefaults,
  patientRegistrationSchema,
  type PatientRegistrationFormValues,
} from './patient-registration-schema';

type PatientRegistrationDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PatientRegistrationFormValues) => Promise<boolean>;
};

export function PatientRegistrationDialog({
  open,
  onClose,
  onSubmit,
}: PatientRegistrationDialogProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    reset,
    handleSubmit,
  } = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: patientRegistrationDefaults,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(patientRegistrationDefaults);
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) {
      reset(patientRegistrationDefaults);
      onClose();
    }
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-title"
      aria-describedby="registration-description"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <Card className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto shadow-xl">
        <CardHeader className="border-b border-border">
          <CardTitle id="registration-title" className="flex items-center gap-2 text-base font-bold text-foreground">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            Daftarkan pasien baru
          </CardTitle>
          <p id="registration-description" className="text-xs leading-relaxed text-muted-foreground">
            Data identitas ini digunakan untuk membuat nomor rekam medis dan mengirim pendaftaran ke alur SATUSEHAT.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field data-invalid={Boolean(errors.nik)}>
              <FieldLabel htmlFor="registration-nik">NIK (16 digit sesuai KTP)</FieldLabel>
              <Input
                {...register('nik')}
                id="registration-nik"
                type="text"
                maxLength={16}
                inputMode="numeric"
                placeholder="Contoh: 3171012304900001"
                className="font-mono text-sm"
                autoFocus
                aria-invalid={Boolean(errors.nik)}
                aria-describedby="registration-nik-error"
              />
              <FieldError id="registration-nik-error" errors={[errors.nik]} />
            </Field>

            <Field data-invalid={Boolean(errors.fullName)}>
              <FieldLabel htmlFor="registration-name">Nama lengkap pasien</FieldLabel>
              <Input
                {...register('fullName')}
                id="registration-name"
                type="text"
                placeholder="Nama sesuai KTP"
                className="text-sm"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby="registration-name-error"
              />
              <FieldError id="registration-name-error" errors={[errors.fullName]} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.birthDate)}>
                <FieldLabel htmlFor="registration-birth-date">Tanggal lahir</FieldLabel>
                <Input
                  {...register('birthDate')}
                  id="registration-birth-date"
                  type="date"
                  className="text-sm"
                  aria-invalid={Boolean(errors.birthDate)}
                  aria-describedby="registration-birth-date-error"
                />
                <FieldError id="registration-birth-date-error" errors={[errors.birthDate]} />
              </Field>

              <Controller
                name="gender"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="registration-gender">Jenis kelamin</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? '')}
                    >
                      <SelectTrigger
                        id="registration-gender"
                        className="min-w-0 w-full px-3 text-sm"
                        aria-invalid={fieldState.invalid}
                        aria-describedby="registration-gender-error"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Laki-laki</SelectItem>
                        <SelectItem value="FEMALE">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError id="registration-gender-error" errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Field data-invalid={Boolean(errors.address)}>
              <FieldLabel htmlFor="registration-address">Alamat tempat tinggal</FieldLabel>
              <Input
                {...register('address')}
                id="registration-address"
                type="text"
                placeholder="Jl. Melati No. 12"
                aria-invalid={Boolean(errors.address)}
                aria-describedby="registration-address-error"
              />
              <FieldError id="registration-address-error" errors={[errors.address]} />
            </Field>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? 'Menyimpan...' : 'Simpan pasien'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
