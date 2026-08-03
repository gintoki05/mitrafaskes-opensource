"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Layers3, Save } from "lucide-react";
import type { OrganizationSummary, ServiceUnitSummary } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboboxField } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyServiceUnit, serviceUnitTypes } from "./constants";
import { SelectField } from "./FormField";
import { serviceUnitFormSchema } from "./schemas";
import type {
  FormMode,
  ServiceUnitForm as ServiceUnitFormValues,
  SubmitHandler,
  SubmittingKind,
} from "./types";

type ServiceUnitFormProps = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  submitting: SubmittingKind | null;
  onSubmit: SubmitHandler<ServiceUnitFormValues>;
  initialValues?: ServiceUnitFormValues;
  mode?: FormMode;
  excludeId?: string;
  onCancel?: () => void;
};

export function ServiceUnitForm({
  canWrite,
  organizations,
  serviceUnits,
  submitting,
  onSubmit,
  initialValues,
  mode = "create",
  excludeId,
  onCancel,
}: ServiceUnitFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    reset,
    handleSubmit,
    setValue,
  } = useForm<ServiceUnitFormValues>({
    resolver: zodResolver(serviceUnitFormSchema),
    defaultValues: initialValues ?? emptyServiceUnit,
    mode: "onBlur",
  });
  const organizationId = useWatch({ control, name: "organizationId" });
  const serviceUnitParents = serviceUnits.filter(
    (unit) => unit.organizationId === organizationId && unit.id !== excludeId,
  );

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) {
      reset({ ...emptyServiceUnit, organizationId: values.organizationId });
    }
  });

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Layers3 className="h-4 w-4 text-primary" />
          Unit Layanan / Poli
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {canWrite ? (
          <form className="space-y-3" onSubmit={submit} noValidate>
            <Controller
              name="organizationId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="unit-organization">Organisasi induk</FieldLabel>
                  <ComboboxField
                    id="unit-organization"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      setValue("parentId", "");
                    }}
                    placeholder="Pilih organisasi"
                    options={organizations.map((organization) => ({
                      value: organization.id,
                      label: `${organization.code} - ${organization.name}`,
                    }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.code)}>
                <FieldLabel htmlFor="unit-code">Kode unit</FieldLabel>
                <Input
                  {...register("code")}
                  id="unit-code"
                  placeholder="POLI-UMUM"
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby="unit-code-error"
                />
                <FieldError id="unit-code-error" errors={[errors.code]} />
              </Field>

              <Controller
                name="type"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="unit-type">Jenis unit</FieldLabel>
                    <SelectField
                      id="unit-type"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {serviceUnitTypes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="unit-name">Nama unit layanan</FieldLabel>
              <Input
                {...register("name")}
                id="unit-name"
                placeholder="Poli Umum"
                aria-invalid={Boolean(errors.name)}
                aria-describedby="unit-name-error"
              />
              <FieldError id="unit-name-error" errors={[errors.name]} />
            </Field>

            <Controller
              name="parentId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="unit-parent">Unit induk (opsional)</FieldLabel>
                  <ComboboxField
                    id="unit-parent"
                    value={field.value}
                    disabled={!organizationId}
                    onChange={field.onChange}
                    placeholder="Tidak ada"
                    options={serviceUnitParents.map((unit) => ({
                      value: unit.id,
                      label: `${unit.code} - ${unit.name}`,
                    }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="active"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="unit-active">Status</FieldLabel>
                  <SelectField
                    id="unit-active"
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
                {submitting === "unit"
                  ? "Menyimpan..."
                  : mode === "edit"
                    ? "Simpan perubahan"
                    : "Simpan unit layanan"}
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
