"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { MapPin, Save } from "lucide-react";
import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboboxField } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  emptyLocation,
  locationModes,
  locationStatuses,
  locationTypes,
} from "./constants";
import { SelectField } from "./FormField";
import { locationFormSchema } from "./schemas";
import type {
  FormMode,
  LocationForm as LocationFormValues,
  SubmitHandler,
  SubmittingKind,
} from "./types";

type LocationFormProps = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  locations: LocationSummary[];
  submitting: SubmittingKind | null;
  onSubmit: SubmitHandler<LocationFormValues>;
  initialValues?: LocationFormValues;
  mode?: FormMode;
  excludeId?: string;
  onCancel?: () => void;
};

export function LocationForm({
  canWrite,
  organizations,
  serviceUnits,
  locations,
  submitting,
  onSubmit,
  initialValues,
  mode = "create",
  excludeId,
  onCancel,
}: LocationFormProps) {
  const {
    control,
    formState: { errors, isSubmitting },
    register,
    reset,
    handleSubmit,
    setValue,
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: initialValues ?? emptyLocation,
    mode: "onBlur",
  });
  const organizationId = useWatch({ control, name: "organizationId" });
  const selectedServiceUnits = serviceUnits.filter(
    (unit) => unit.organizationId === organizationId,
  );
  const selectedLocationParents = locations.filter(
    (location) =>
      location.organizationId === organizationId && location.id !== excludeId,
  );

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) {
      reset({ ...emptyLocation, organizationId: values.organizationId });
    }
  });

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" />
          Location / Ruangan
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
                <FieldLabel htmlFor="location-code" required>
                  Kode lokasi
                </FieldLabel>
                <Input
                  {...register("code")}
                  id="location-code"
                  placeholder="RUANG-01"
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby="location-code-error"
                />
                <FieldError id="location-code-error" errors={[errors.code]} />
              </Field>

              <Controller
                name="type"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="location-type" required>
                      Jenis lokasi
                    </FieldLabel>
                    <SelectField
                      id="location-type"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {locationTypes.map((option) => (
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Controller
                name="status"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="location-status" required>
                      Status location
                    </FieldLabel>
                    <SelectField
                      id="location-status"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {locationStatuses.map((option) => (
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
                name="mode"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="location-mode" required>
                      Mode
                    </FieldLabel>
                    <SelectField
                      id="location-mode"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {locationModes.map((option) => (
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
              <FieldLabel htmlFor="location-name" required>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.physicalTypeCode)}>
                <FieldLabel htmlFor="location-physical-type">
                  Kode physical type (opsional)
                </FieldLabel>
                <Input
                  {...register("physicalTypeCode")}
                  id="location-physical-type"
                  placeholder="RO"
                  aria-invalid={Boolean(errors.physicalTypeCode)}
                  aria-describedby="location-physical-type-error"
                />
                <FieldError id="location-physical-type-error" errors={[errors.physicalTypeCode]} />
              </Field>

              <Controller
                name="countryCode"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="location-country" required>
                      Kode negara
                    </FieldLabel>
                    <Input
                      id="location-country"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="ID"
                      aria-invalid={fieldState.invalid}
                      aria-describedby="location-country-error"
                    />
                    <FieldError id="location-country-error" errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              name="serviceUnitId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="location-unit">
                    Unit layanan (opsional)
                  </FieldLabel>
                  <ComboboxField
                    id="location-unit"
                    value={field.value}
                    disabled={!organizationId}
                    onChange={field.onChange}
                    placeholder="Tidak ditetapkan"
                    options={selectedServiceUnits.map((unit) => ({
                      value: unit.id,
                      label: `${unit.code} - ${unit.name}`,
                    }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="parentId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="location-parent">
                    Lokasi induk (opsional)
                  </FieldLabel>
                  <ComboboxField
                    id="location-parent"
                    value={field.value}
                    disabled={!organizationId}
                    onChange={field.onChange}
                    placeholder="Tidak ada"
                    options={selectedLocationParents.map((location) => ({
                      value: location.id,
                      label: `${location.code} - ${location.name}`,
                    }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="location-description">
                Keterangan (opsional)
              </FieldLabel>
              <textarea
                {...register("description")}
                id="location-description"
                rows={2}
                className="clinical-field w-full px-2.5 py-2 text-sm"
                placeholder="Opsional"
                aria-invalid={Boolean(errors.description)}
                aria-describedby="location-description-error"
              />
              <FieldError id="location-description-error" errors={[errors.description]} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.addressText)}>
                <FieldLabel htmlFor="location-address">
                  Alamat lokasi (opsional)
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

              <Field data-invalid={Boolean(errors.city)}>
                <FieldLabel htmlFor="location-city">Kota (opsional)</FieldLabel>
                <Input
                  {...register("city")}
                  id="location-city"
                  placeholder="Jakarta"
                  aria-invalid={Boolean(errors.city)}
                  aria-describedby="location-city-error"
                />
                <FieldError id="location-city-error" errors={[errors.city]} />
              </Field>
            </div>

            <Field data-invalid={Boolean(errors.postalCode)}>
              <FieldLabel htmlFor="location-postal-code">
                Kode pos (opsional)
              </FieldLabel>
              <Input
                {...register("postalCode")}
                id="location-postal-code"
                placeholder="12345"
                aria-invalid={Boolean(errors.postalCode)}
                aria-describedby="location-postal-code-error"
              />
              <FieldError id="location-postal-code-error" errors={[errors.postalCode]} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field data-invalid={Boolean(errors.latitude)}>
                <FieldLabel htmlFor="location-latitude">
                  Latitude (opsional)
                </FieldLabel>
                <Input
                  {...register("latitude")}
                  id="location-latitude"
                  type="number"
                  step="any"
                  placeholder="-6.231154"
                  aria-invalid={Boolean(errors.latitude)}
                  aria-describedby="location-latitude-error"
                />
                <FieldError id="location-latitude-error" errors={[errors.latitude]} />
              </Field>

              <Field data-invalid={Boolean(errors.longitude)}>
                <FieldLabel htmlFor="location-longitude">
                  Longitude (opsional)
                </FieldLabel>
                <Input
                  {...register("longitude")}
                  id="location-longitude"
                  type="number"
                  step="any"
                  placeholder="106.832398"
                  aria-invalid={Boolean(errors.longitude)}
                  aria-describedby="location-longitude-error"
                />
                <FieldError id="location-longitude-error" errors={[errors.longitude]} />
              </Field>

              <Field data-invalid={Boolean(errors.altitude)}>
                <FieldLabel htmlFor="location-altitude">
                  Altitude (opsional)
                </FieldLabel>
                <Input
                  {...register("altitude")}
                  id="location-altitude"
                  type="number"
                  step="any"
                  placeholder="0"
                  aria-invalid={Boolean(errors.altitude)}
                  aria-describedby="location-altitude-error"
                />
                <FieldError id="location-altitude-error" errors={[errors.altitude]} />
              </Field>
            </div>

            <Controller
              name="active"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="location-active" required>
                    Status data
                  </FieldLabel>
                  <SelectField
                    id="location-active"
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
                disabled={submitting !== null || isSubmitting || !organizationId}
                className="text-xs font-bold sm:min-w-44"
              >
                <Save className="h-4 w-4" />
                {submitting === "location"
                  ? "Menyimpan..."
                  : mode === "edit"
                    ? "Simpan perubahan"
                    : "Simpan location"}
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
