"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Building2, Save } from "lucide-react";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboboxField } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyOrganization, organizationTypes } from "./constants";
import { SelectField } from "./FormField";
import { organizationFormSchema } from "./schemas";
import type {
  FormMode,
  OrganizationForm as OrganizationFormValues,
  SubmitHandler,
  SubmittingKind,
} from "./types";

type OrganizationFormProps = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  submitting: SubmittingKind | null;
  onSubmit: SubmitHandler<OrganizationFormValues>;
  initialValues?: OrganizationFormValues;
  mode?: FormMode;
  excludeId?: string;
  onCancel?: () => void;
};

export function OrganizationForm({
  canWrite,
  organizations,
  submitting,
  onSubmit,
  initialValues,
  mode = "create",
  excludeId,
  onCancel,
}: OrganizationFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    reset,
    handleSubmit,
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: initialValues ?? emptyOrganization,
    mode: "onBlur",
  });

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) reset(emptyOrganization);
  });

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Building2 className="h-4 w-4 text-primary" />
          Organisasi / Faskes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {canWrite ? (
          <form className="space-y-3" onSubmit={submit} noValidate>
            <Field data-invalid={Boolean(errors.code)}>
              <FieldLabel htmlFor="organization-code">Kode master</FieldLabel>
              <Input
                {...register("code")}
                id="organization-code"
                placeholder="KLINIK-UTAMA"
                aria-invalid={Boolean(errors.code)}
                aria-describedby="organization-code-error"
              />
              <FieldError id="organization-code-error" errors={[errors.code]} />
            </Field>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="organization-name">
                Nama organisasi / faskes
              </FieldLabel>
              <Input
                {...register("name")}
                id="organization-name"
                placeholder="Klinik Mitra Sehat"
                aria-invalid={Boolean(errors.name)}
                aria-describedby="organization-name-error"
              />
              <FieldError id="organization-name-error" errors={[errors.name]} />
            </Field>

            <Controller
              name="type"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="organization-type">Jenis organisasi</FieldLabel>
                  <SelectField
                    id="organization-type"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    aria-label="Jenis organisasi"
                  >
                    {organizationTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="parentId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="organization-parent">
                    Organisasi induk (opsional)
                  </FieldLabel>
                  <ComboboxField
                    id="organization-parent"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Tidak ada, sebagai induk"
                    options={organizations
                      .filter((organization) => organization.id !== excludeId)
                      .map((organization) => ({
                        value: organization.id,
                        label: `${organization.code} - ${organization.name}`,
                      }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Field data-invalid={Boolean(errors.addressText)}>
              <FieldLabel htmlFor="organization-address">Alamat</FieldLabel>
              <Input
                {...register("addressText")}
                id="organization-address"
                placeholder="Alamat faskes"
                aria-invalid={Boolean(errors.addressText)}
                aria-describedby="organization-address-error"
              />
              <FieldError id="organization-address-error" errors={[errors.addressText]} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="organization-phone">Telepon</FieldLabel>
                <Input
                  {...register("phone")}
                  id="organization-phone"
                  placeholder="021..."
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby="organization-phone-error"
                />
                <FieldError id="organization-phone-error" errors={[errors.phone]} />
              </Field>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="organization-email">Email</FieldLabel>
                <Input
                  {...register("email")}
                  id="organization-email"
                  type="email"
                  placeholder="admin@..."
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby="organization-email-error"
                />
                <FieldError id="organization-email-error" errors={[errors.email]} />
              </Field>
            </div>

            <Controller
              name="active"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="organization-active">Status</FieldLabel>
                  <SelectField
                    id="organization-active"
                    value={field.value ? "true" : "false"}
                    onChange={(value) => field.onChange(value === "true")}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </SelectField>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {onCancel ? (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Batal
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={submitting !== null || isSubmitting}
                className="text-xs font-bold sm:min-w-44"
              >
                <Save className="h-4 w-4" />
                {submitting === "organization"
                  ? "Menyimpan..."
                  : mode === "edit"
                    ? "Simpan perubahan"
                    : "Simpan organisasi"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Akun ini hanya dapat melihat master faskes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
