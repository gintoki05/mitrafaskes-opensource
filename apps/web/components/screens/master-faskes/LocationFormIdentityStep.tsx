import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import type { LocationForm as LocationFormValues } from "./types";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "./FormLayout";
import { SelectField } from "./FormField";
import { locationModes, locationStatuses, locationTypes } from "./constants";

type LocationFormIdentityStepProps = {
  control: Control<LocationFormValues>;
  errors: FieldErrors<LocationFormValues>;
  register: UseFormRegister<LocationFormValues>;
};

export function LocationFormIdentityStep({
  control,
  errors,
  register,
}: LocationFormIdentityStepProps) {
  return (
    <FormSection
      title="Identitas & status"
      description="Gunakan istilah yang mudah dikenali tim operasional dan pastikan statusnya sesuai kondisi lokasi."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.code)}>
            <FieldLabel htmlFor="location-code" required="Wajib">
              Kode lokasi
            </FieldLabel>
            <Input
              {...register("code")}
              id="location-code"
              placeholder="RUANG-01"
              className="font-mono"
              aria-invalid={Boolean(errors.code)}
              aria-describedby="location-code-error"
            />
            <FieldError id="location-code-error" errors={[errors.code]} />
          </Field>

          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="location-name" required="Wajib">
              Nama lokasi
            </FieldLabel>
            <Input
              {...register("name")}
              id="location-name"
              placeholder="Ruang Pemeriksaan 1"
              aria-invalid={Boolean(errors.name)}
              aria-describedby="location-name-error"
            />
            <FieldError id="location-name-error" errors={[errors.name]} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Controller
            name="type"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location-type" required="Wajib">
                  Jenis lokasi
                </FieldLabel>
                <SelectField
                  id="location-type"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="location-type-error"
                >
                  {locationTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <FieldError id="location-type-error" errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="mode"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location-mode" required="Wajib">
                  Mode lokasi
                </FieldLabel>
                <SelectField
                  id="location-mode"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="location-mode-error"
                >
                  {locationModes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <FieldError id="location-mode-error" errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location-status" required="Wajib">
                  Status location
                </FieldLabel>
                <SelectField
                  id="location-status"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="location-status-error"
                >
                  {locationStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <FieldError id="location-status-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <Controller
          name="active"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="location-active" required="Wajib">
                Status data lokal
              </FieldLabel>
              <SelectField
                id="location-active"
                value={field.value ? "true" : "false"}
                onChange={(value) => field.onChange(value === "true")}
                aria-invalid={fieldState.invalid}
                aria-describedby="location-active-help location-active-error"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </SelectField>
              <FieldDescription id="location-active-help">
                Status data lokal berbeda dari status operasional Location SATUSEHAT.
              </FieldDescription>
              <FieldError id="location-active-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </FormSection>
  );
}
