import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import { ComboboxField } from "@/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "./FormLayout";
import { SelectField } from "./FormField";
import { organizationTypes } from "./constants";
import type {
  OrganizationForm as OrganizationFormValues,
} from "./types";

type OrganizationFormIdentityStepProps = {
  control: Control<OrganizationFormValues>;
  errors: FieldErrors<OrganizationFormValues>;
  register: UseFormRegister<OrganizationFormValues>;
  organizationType: OrganizationFormValues["type"];
  organizations: OrganizationSummary[];
  excludeId?: string;
};

export function OrganizationFormIdentityStep({
  control,
  errors,
  register,
  organizationType,
  organizations,
  excludeId,
}: OrganizationFormIdentityStepProps) {
  return (
    <FormSection
      title="Identitas wajib"
      description="Pastikan tiga informasi utama ini benar sebelum melanjutkan."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.code)}>
          <FieldLabel htmlFor="organization-code" required="Wajib">
            Kode master
          </FieldLabel>
          <Input
            {...register("code")}
            id="organization-code"
            placeholder="KLINIK-UTAMA"
            className="font-mono"
            aria-invalid={Boolean(errors.code)}
            aria-describedby="organization-code-error"
          />
          <FieldError id="organization-code-error" errors={[errors.code]} />
        </Field>

        <Controller
          name="type"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="organization-type" required="Wajib">
                Jenis organisasi
              </FieldLabel>
              <SelectField
                id="organization-type"
                value={field.value}
                onChange={field.onChange}
                aria-invalid={fieldState.invalid}
                aria-describedby="organization-type-error"
              >
                {organizationTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <FieldError id="organization-type-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="organization-name" required="Wajib">
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
          name="parentId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="organization-parent"
                required={organizationType === "SUB_ORGANIZATION" ? "Wajib" : "Opsional"}
              >
                Organisasi induk
              </FieldLabel>
              <ComboboxField
                id="organization-parent"
                value={field.value}
                onChange={field.onChange}
                placeholder={
                  organizationType === "SUB_ORGANIZATION"
                    ? "Pilih organisasi induk"
                    : "Tidak ada, sebagai induk"
                }
                aria-describedby="organization-parent-help organization-parent-error"
                aria-invalid={fieldState.invalid}
                options={organizations
                  .filter((organization) => organization.id !== excludeId)
                  .map((organization) => ({
                    value: organization.id,
                    label: `${organization.code} - ${organization.name}`,
                  }))}
              />
              <FieldDescription id="organization-parent-help">
                {organizationType === "SUB_ORGANIZATION"
                  ? "Sub-organisasi harus berada di bawah organisasi yang sudah ada."
                  : "Kosongkan jika data ini menjadi organisasi induk."}
              </FieldDescription>
              <FieldError id="organization-parent-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </FormSection>
  );
}
