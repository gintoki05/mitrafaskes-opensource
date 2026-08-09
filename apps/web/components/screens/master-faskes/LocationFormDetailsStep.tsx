import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { LocationForm as LocationFormValues } from "./types";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "./FormLayout";

type LocationFormDetailsStepProps = {
  errors: FieldErrors<LocationFormValues>;
  register: UseFormRegister<LocationFormValues>;
};

export function LocationFormDetailsStep({
  errors,
  register,
}: LocationFormDetailsStepProps) {
  return (
    <FormSection
      title="Data fisik (lanjutan)"
      description="Lengkapi alamat dan koordinat bila data ini dibutuhkan untuk pemetaan atau sinkronisasi."
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground">Alamat</h3>
          <Field data-invalid={Boolean(errors.addressText)}>
            <FieldLabel htmlFor="location-address" required="Opsional">
              Alamat lokasi
            </FieldLabel>
            <Input
              {...register("addressText")}
              id="location-address"
              placeholder="Gedung utama, lantai 1"
              aria-invalid={Boolean(errors.addressText)}
              aria-describedby="location-address-error"
            />
            <FieldError id="location-address-error" errors={[errors.addressText]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={Boolean(errors.city)}>
              <FieldLabel htmlFor="location-city" required="Opsional">
                Kota
              </FieldLabel>
              <Input
                {...register("city")}
                id="location-city"
                placeholder="Jakarta"
                aria-invalid={Boolean(errors.city)}
                aria-describedby="location-city-error"
              />
              <FieldError id="location-city-error" errors={[errors.city]} />
            </Field>

            <Field data-invalid={Boolean(errors.postalCode)}>
              <FieldLabel htmlFor="location-postal-code" required="Opsional">
                Kode pos
              </FieldLabel>
              <Input
                {...register("postalCode")}
                id="location-postal-code"
                placeholder="12345"
                inputMode="numeric"
                aria-invalid={Boolean(errors.postalCode)}
                aria-describedby="location-postal-code-error"
              />
              <FieldError id="location-postal-code-error" errors={[errors.postalCode]} />
            </Field>

            <Field data-invalid={Boolean(errors.countryCode)}>
              <FieldLabel htmlFor="location-country" required>
                Kode negara
              </FieldLabel>
              <Input
                {...register("countryCode", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase();
                  },
                })}
                id="location-country"
                maxLength={2}
                placeholder="ID"
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.countryCode)}
                aria-describedby="location-country-error"
              />
              <FieldError id="location-country-error" errors={[errors.countryCode]} />
            </Field>
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <div>
            <h3 className="text-xs font-bold text-foreground">Keterangan & koordinat</h3>
            <FieldDescription>
              Koordinat memakai angka desimal. Contoh Jakarta: latitude -6.231154, longitude 106.832398.
            </FieldDescription>
          </div>

          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor="location-description" required="Opsional">
              Keterangan
            </FieldLabel>
            <textarea
              {...register("description")}
              id="location-description"
              rows={3}
              className="clinical-field min-h-24 w-full px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="Contoh: ruangan berada di sisi timur gedung utama."
              aria-invalid={Boolean(errors.description)}
              aria-describedby="location-description-error"
            />
            <FieldError id="location-description-error" errors={[errors.description]} />
          </Field>

          <Field data-invalid={Boolean(errors.physicalTypeCode)}>
            <FieldLabel htmlFor="location-physical-type" required="Opsional">
              Kode physical type
            </FieldLabel>
            <Input
              {...register("physicalTypeCode")}
              id="location-physical-type"
              placeholder="RO"
              className="font-mono"
              aria-invalid={Boolean(errors.physicalTypeCode)}
              aria-describedby="location-physical-type-error"
            />
            <FieldError id="location-physical-type-error" errors={[errors.physicalTypeCode]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={Boolean(errors.latitude)}>
              <FieldLabel htmlFor="location-latitude" required="Opsional">
                Latitude
              </FieldLabel>
              <Input
                {...register("latitude")}
                id="location-latitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="-6.231154"
                aria-invalid={Boolean(errors.latitude)}
                aria-describedby="location-latitude-error"
              />
              <FieldError id="location-latitude-error" errors={[errors.latitude]} />
            </Field>

            <Field data-invalid={Boolean(errors.longitude)}>
              <FieldLabel htmlFor="location-longitude" required="Opsional">
                Longitude
              </FieldLabel>
              <Input
                {...register("longitude")}
                id="location-longitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="106.832398"
                aria-invalid={Boolean(errors.longitude)}
                aria-describedby="location-longitude-error"
              />
              <FieldError id="location-longitude-error" errors={[errors.longitude]} />
            </Field>

            <Field data-invalid={Boolean(errors.altitude)}>
              <FieldLabel htmlFor="location-altitude" required="Opsional">
                Altitude
              </FieldLabel>
              <Input
                {...register("altitude")}
                id="location-altitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                aria-invalid={Boolean(errors.altitude)}
                aria-describedby="location-altitude-error"
              />
              <FieldError id="location-altitude-error" errors={[errors.altitude]} />
            </Field>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
