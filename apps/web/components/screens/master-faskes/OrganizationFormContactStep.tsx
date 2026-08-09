import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "./FormLayout";
import { SelectField } from "./FormField";
import type { OrganizationForm as OrganizationFormValues } from "./types";

type OrganizationFormContactStepProps = {
  control: Control<OrganizationFormValues>;
  errors: FieldErrors<OrganizationFormValues>;
  register: UseFormRegister<OrganizationFormValues>;
};

export function OrganizationFormContactStep({
  control,
  errors,
  register,
}: OrganizationFormContactStepProps) {
  return (
    <FormSection
      title="Kontak & status"
      description="Data tambahan ini dapat dilengkapi sekarang atau diperbarui nanti."
    >
      <div className="space-y-4">
        <Field data-invalid={Boolean(errors.addressText)}>
          <FieldLabel htmlFor="organization-address" required="Opsional">
            Alamat
          </FieldLabel>
          <Input
            {...register("addressText")}
            id="organization-address"
            placeholder="Alamat faskes"
            aria-invalid={Boolean(errors.addressText)}
            aria-describedby="organization-address-error"
          />
          <FieldError id="organization-address-error" errors={[errors.addressText]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.phone)}>
            <FieldLabel htmlFor="organization-phone" required="Opsional">
              Telepon
            </FieldLabel>
            <Input
              {...register("phone")}
              id="organization-phone"
              placeholder="021..."
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby="organization-phone-error"
            />
            <FieldError id="organization-phone-error" errors={[errors.phone]} />
          </Field>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="organization-email" required="Opsional">
              Email
            </FieldLabel>
            <Input
              {...register("email")}
              id="organization-email"
              type="email"
              placeholder="admin@mitra-faskes.id"
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
              <FieldLabel htmlFor="organization-active" required>
                Status data
              </FieldLabel>
              <SelectField
                id="organization-active"
                value={field.value ? "true" : "false"}
                onChange={(value) => field.onChange(value === "true")}
                aria-invalid={fieldState.invalid}
                aria-describedby="organization-active-help organization-active-error"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </SelectField>
              <FieldDescription id="organization-active-help">
                Nonaktif hanya menyembunyikan data dari pilihan aktif; data lokal tetap tersimpan.
              </FieldDescription>
              <FieldError id="organization-active-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </FormSection>
  );
}
