"use client";

import { type FormEvent, useMemo, useState } from "react";
import { MapPin, Save } from "lucide-react";
import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { emptyLocation, locationModes, locationStatuses, locationTypes } from "./constants";
import { FieldLabel, SelectField } from "./FormField";
import type {
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
};

export function LocationForm({
  canWrite,
  organizations,
  serviceUnits,
  locations,
  submitting,
  onSubmit,
}: LocationFormProps) {
  const [form, setForm] = useState(emptyLocation);
  const selectedServiceUnits = useMemo(
    () =>
      serviceUnits.filter(
        (unit) => unit.organizationId === form.organizationId,
      ),
    [form.organizationId, serviceUnits],
  );
  const selectedLocationParents = useMemo(
    () =>
      locations.filter(
        (location) => location.organizationId === form.organizationId,
      ),
    [form.organizationId, locations],
  );

  const update = <K extends keyof LocationFormValues>(
    field: K,
    value: LocationFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOrganizationChange = (organizationId: string) => {
    setForm((current) => ({
      ...current,
      organizationId,
      serviceUnitId: "",
      parentId: "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await onSubmit(form)) {
      setForm((current) => ({
        ...emptyLocation,
        organizationId: current.organizationId,
      }));
    }
  };

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
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <FieldLabel htmlFor="location-organization">
                Organisasi induk
              </FieldLabel>
              <SelectField
                id="location-organization"
                value={form.organizationId}
                onChange={handleOrganizationChange}
              >
                <option value="">Pilih organisasi</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.code} — {organization.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="location-code">Kode lokasi</FieldLabel>
                <Input
                  id="location-code"
                  value={form.code}
                  onChange={(event) => update("code", event.target.value)}
                  placeholder="RUANG-01"
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="location-type">Jenis lokasi</FieldLabel>
                <SelectField
                  id="location-type"
                  value={form.type}
                  onChange={(value) =>
                    update("type", value as LocationFormValues["type"])
                  }
                >
                  {locationTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="location-status">Status</FieldLabel>
                <SelectField
                  id="location-status"
                  value={form.status}
                  onChange={(value) =>
                    update("status", value as LocationFormValues["status"])
                  }
                >
                  {locationStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="location-mode">Mode</FieldLabel>
                <SelectField
                  id="location-mode"
                  value={form.mode}
                  onChange={(value) =>
                    update("mode", value as LocationFormValues["mode"])
                  }
                >
                  {locationModes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="location-name">Nama lokasi</FieldLabel>
              <Input
                id="location-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Ruang Pemeriksaan 1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="location-physical-type">
                  Kode physical type
                </FieldLabel>
                <Input
                  id="location-physical-type"
                  value={form.physicalTypeCode}
                  onChange={(event) =>
                    update("physicalTypeCode", event.target.value)
                  }
                  placeholder="RO"
                />
              </div>
              <div>
                <FieldLabel htmlFor="location-country">Kode negara</FieldLabel>
                <Input
                  id="location-country"
                  value={form.countryCode}
                  onChange={(event) =>
                    update("countryCode", event.target.value.toUpperCase())
                  }
                  maxLength={2}
                  placeholder="ID"
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="location-unit">
                Unit layanan (opsional)
              </FieldLabel>
              <SelectField
                id="location-unit"
                value={form.serviceUnitId}
                disabled={!form.organizationId}
                onChange={(serviceUnitId) => update("serviceUnitId", serviceUnitId)}
              >
                <option value="">Tidak ditetapkan</option>
                {selectedServiceUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} — {unit.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel htmlFor="location-parent">
                Lokasi induk (opsional)
              </FieldLabel>
              <SelectField
                id="location-parent"
                value={form.parentId}
                disabled={!form.organizationId}
                onChange={(parentId) => update("parentId", parentId)}
              >
                <option value="">Tidak ada</option>
                {selectedLocationParents.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} — {location.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel htmlFor="location-description">
                Keterangan
              </FieldLabel>
              <textarea
                id="location-description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={2}
                className="clinical-field w-full px-2.5 py-2 text-sm"
                placeholder="Opsional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="location-address">
                  Alamat lokasi
                </FieldLabel>
                <Input
                  id="location-address"
                  value={form.addressText}
                  onChange={(event) => update("addressText", event.target.value)}
                  placeholder="Gedung utama, lantai 1"
                />
              </div>
              <div>
                <FieldLabel htmlFor="location-city">Kota</FieldLabel>
                <Input
                  id="location-city"
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="Jakarta"
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="location-postal-code">Kode pos</FieldLabel>
              <Input
                id="location-postal-code"
                value={form.postalCode}
                onChange={(event) => update("postalCode", event.target.value)}
                placeholder="12345"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting !== null || !form.organizationId}
              className="w-full text-xs font-bold"
            >
              <Save className="h-4 w-4" />
              {submitting === "location" ? "Menyimpan..." : "Simpan location"}
            </Button>
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
