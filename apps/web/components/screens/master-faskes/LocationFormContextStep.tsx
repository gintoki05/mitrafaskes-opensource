import { Controller, type Control, type UseFormSetValue } from "react-hook-form";
import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { ComboboxField } from "@/components/ui/combobox";
import { FormSection } from "./FormLayout";
import type { LocationForm as LocationFormValues } from "./types";

type LocationFormContextStepProps = {
  control: Control<LocationFormValues>;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  locations: LocationSummary[];
  organizationId: string;
  excludeId?: string;
  setValue: UseFormSetValue<LocationFormValues>;
};

export function LocationFormContextStep({
  control,
  organizations,
  serviceUnits,
  locations,
  organizationId,
  excludeId,
  setValue,
}: LocationFormContextStepProps) {
  const selectedServiceUnits = serviceUnits.filter(
    (unit) => unit.organizationId === organizationId,
  );
  const selectedLocationParents = locations.filter(
    (location) =>
      location.organizationId === organizationId && location.id !== excludeId,
  );

  return (
    <FormSection
      title="Konteks lokasi"
      description="Tentukan organisasi dan hubungan lokasi terlebih dahulu agar pilihan berikutnya tetap relevan."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="organizationId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor="location-organization" required>
                Organisasi induk
              </FieldLabel>
              <ComboboxField
                id="location-organization"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  setValue("serviceUnitId", "");
                  setValue("parentId", "");
                }}
                placeholder="Pilih organisasi"
                aria-invalid={fieldState.invalid}
                aria-describedby="location-organization-error"
                options={organizations.map((organization) => ({
                  value: organization.id,
                  label: `${organization.code} - ${organization.name}`,
                }))}
              />
              <FieldError id="location-organization-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="serviceUnitId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="location-unit" required="Opsional">
                Unit layanan
              </FieldLabel>
              <ComboboxField
                id="location-unit"
                value={field.value}
                disabled={!organizationId}
                onChange={field.onChange}
                placeholder={
                  organizationId ? "Tidak ditetapkan" : "Pilih organisasi dulu"
                }
                aria-invalid={fieldState.invalid}
                aria-describedby="location-unit-help location-unit-error"
                options={selectedServiceUnits.map((unit) => ({
                  value: unit.id,
                  label: `${unit.code} - ${unit.name}`,
                }))}
              />
              <FieldDescription id="location-unit-help" className="sm:min-h-9">
                Hubungkan lokasi ke poli atau unit layanan bila sudah tersedia.
              </FieldDescription>
              <FieldError id="location-unit-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="parentId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="location-parent" required="Opsional">
                Lokasi induk
              </FieldLabel>
              <ComboboxField
                id="location-parent"
                value={field.value}
                disabled={!organizationId}
                onChange={field.onChange}
                placeholder={organizationId ? "Tidak ada" : "Pilih organisasi dulu"}
                aria-invalid={fieldState.invalid}
                aria-describedby="location-parent-help location-parent-error"
                options={selectedLocationParents.map((location) => ({
                  value: location.id,
                  label: `${location.code} - ${location.name}`,
                }))}
              />
              <FieldDescription id="location-parent-help" className="sm:min-h-9">
                Gunakan untuk menghubungkan ruangan ke gedung atau lantai induknya.
              </FieldDescription>
              <FieldError id="location-parent-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </FormSection>
  );
}
