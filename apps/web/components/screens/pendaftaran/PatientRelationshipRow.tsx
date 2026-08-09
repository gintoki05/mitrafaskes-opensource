"use client";

import { Trash2 } from "lucide-react";
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "../master-faskes/FormField";
import type {
  PatientFormValues,
  PatientRelationshipFormValues,
} from "./patient-form-schema";

type PatientRelationshipRowProps = {
  control: Control<PatientFormValues>;
  errors?: FieldErrors<PatientRelationshipFormValues>;
  register: UseFormRegister<PatientFormValues>;
  index: number;
  disabled: boolean;
  onRemove: () => void;
};

export function PatientRelationshipRow({
  control,
  errors,
  register,
  index,
  disabled,
  onRemove,
}: PatientRelationshipRowProps) {
  const fieldName = <T extends keyof PatientRelationshipFormValues>(field: T) =>
    `relationships.${index}.${field}` as const;
  const target = useWatch({
    control,
    name: fieldName("relationshipTarget"),
  });
  const relatedPersonId = useWatch({
    control,
    name: fieldName("relatedPersonId"),
  });
  const codeId = `patient-relationship-${index}-code`;
  const targetId = `patient-relationship-${index}-target`;

  return (
    <Card className="border-border bg-muted/15 p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">
            Relasi {index + 1}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Pilih satu target untuk relasi ini.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Hapus relasi ${index + 1}`}
          title="Hapus relasi"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name={fieldName("relationshipCode")}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={codeId} required>
                Jenis relasi
              </FieldLabel>
              <SelectField
                id={codeId}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
              >
                <option value="">Pilih jenis relasi</option>
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
          name={fieldName("relationshipTarget")}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={targetId} required>
                Target relasi
              </FieldLabel>
              <SelectField
                id={targetId}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
              >
                <option value="">Pilih target relasi</option>
                <option value="PATIENT">Patient lain</option>
                <option value="PERSON">Related person</option>
              </SelectField>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {target === "PATIENT" ? (
          <Field
            className="sm:col-span-2"
            data-invalid={Boolean(errors?.relatedPatientId)}
          >
            <FieldLabel
              htmlFor={`patient-relationship-${index}-patient-id`}
              required
            >
              ID Patient lokal terkait
            </FieldLabel>
            <Input
              id={`patient-relationship-${index}-patient-id`}
              {...register(fieldName("relatedPatientId"))}
              disabled={disabled}
              placeholder="Contoh: pat-002 atau UUID Patient"
              aria-invalid={Boolean(errors?.relatedPatientId)}
            />
            <FieldError errors={[errors?.relatedPatientId]} />
          </Field>
        ) : null}

        {target === "PERSON" ? (
          <>
            <input type="hidden" {...register(fieldName("relatedPersonId"))} />
            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors?.relatedPersonName)}
            >
              <FieldLabel
                htmlFor={`patient-relationship-${index}-person-name`}
                required
              >
                Nama related person
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-person-name`}
                {...register(fieldName("relatedPersonName"))}
                disabled={disabled}
                placeholder="Nama wali atau pendamping non-Patient"
                aria-invalid={Boolean(errors?.relatedPersonName)}
              />
              <FieldError errors={[errors?.relatedPersonName]} />
              {relatedPersonId ? (
                <p className="text-[11px] text-muted-foreground">
                  Data related person yang sudah tersimpan akan diperbarui saat
                  pasien disimpan.
                </p>
              ) : null}
            </Field>

            <Controller
              control={control}
              name={fieldName("relatedPersonGender")}
              render={({ field }) => (
                <Field>
                  <FieldLabel
                    htmlFor={`patient-relationship-${index}-person-gender`}
                  >
                    Gender related person
                  </FieldLabel>
                  <SelectField
                    id={`patient-relationship-${index}-person-gender`}
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
              <FieldLabel
                htmlFor={`patient-relationship-${index}-person-birth-date`}
              >
                Tanggal lahir related person
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-person-birth-date`}
                {...register(fieldName("relatedPersonBirthDate"))}
                type="date"
                disabled={disabled}
              />
            </Field>
            <Field data-invalid={Boolean(errors?.relatedPersonPhone)}>
              <FieldLabel
                htmlFor={`patient-relationship-${index}-person-phone`}
              >
                Telepon related person
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-person-phone`}
                {...register(fieldName("relatedPersonPhone"))}
                disabled={disabled}
                inputMode="tel"
                aria-invalid={Boolean(errors?.relatedPersonPhone)}
              />
              <FieldError errors={[errors?.relatedPersonPhone]} />
            </Field>
            <Field data-invalid={Boolean(errors?.relatedPersonEmail)}>
              <FieldLabel
                htmlFor={`patient-relationship-${index}-person-email`}
              >
                Email related person
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-person-email`}
                {...register(fieldName("relatedPersonEmail"))}
                disabled={disabled}
                type="email"
                aria-invalid={Boolean(errors?.relatedPersonEmail)}
              />
              <FieldError errors={[errors?.relatedPersonEmail]} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor={`patient-relationship-${index}-person-address`}
              >
                Alamat related person
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-person-address`}
                {...register(fieldName("relatedPersonAddress"))}
                disabled={disabled}
              />
            </Field>
          </>
        ) : null}

        {target ? (
          <>
            <Field data-invalid={Boolean(errors?.startAt)}>
              <FieldLabel htmlFor={`patient-relationship-${index}-start-at`}>
                Mulai berlaku
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-start-at`}
                {...register(fieldName("startAt"))}
                type="date"
                disabled={disabled}
                aria-invalid={Boolean(errors?.startAt)}
              />
              <FieldError errors={[errors?.startAt]} />
            </Field>
            <Field data-invalid={Boolean(errors?.endAt)}>
              <FieldLabel htmlFor={`patient-relationship-${index}-end-at`}>
                Berakhir
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-end-at`}
                {...register(fieldName("endAt"))}
                type="date"
                disabled={disabled}
                aria-invalid={Boolean(errors?.endAt)}
              />
              <FieldError errors={[errors?.endAt]} />
            </Field>
            <Field data-invalid={Boolean(errors?.contactPriority)}>
              <FieldLabel htmlFor={`patient-relationship-${index}-priority`}>
                Prioritas kontak
              </FieldLabel>
              <Input
                id={`patient-relationship-${index}-priority`}
                {...register(fieldName("contactPriority"))}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                disabled={disabled}
                aria-invalid={Boolean(errors?.contactPriority)}
              />
              <FieldError errors={[errors?.contactPriority]} />
            </Field>
            <Controller
              control={control}
              name={fieldName("isGuardian")}
              render={({ field }) => (
                <Field className="flex items-center gap-2 self-end pb-2">
                  <Checkbox
                    id={`patient-relationship-${index}-guardian`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                    aria-label={`Tandai relasi ${index + 1} sebagai wali`}
                  />
                  <FieldLabel
                    htmlFor={`patient-relationship-${index}-guardian`}
                  >
                    Tandai sebagai wali
                  </FieldLabel>
                </Field>
              )}
            />
          </>
        ) : (
          <p className="sm:col-span-2 text-[11px] text-muted-foreground">
            Pilih target untuk menampilkan detail yang perlu diisi.
          </p>
        )}
      </div>
    </Card>
  );
}
