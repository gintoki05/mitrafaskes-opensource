"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Layers3, Save } from "lucide-react";
import type { OrganizationSummary, ServiceUnitSummary } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboboxField } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { emptyServiceUnit, serviceUnitTypes } from "./constants";
import { FieldLabel, SelectField } from "./FormField";
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
  const [form, setForm] = useState(
    initialValues ?? emptyServiceUnit,
  );
  const serviceUnitParents = useMemo(
    () =>
      serviceUnits.filter(
        (unit) =>
          unit.organizationId === form.organizationId &&
          unit.id !== excludeId,
      ),
    [excludeId, form.organizationId, serviceUnits],
  );

  const update = <K extends keyof ServiceUnitFormValues>(
    field: K,
    value: ServiceUnitFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOrganizationChange = (organizationId: string) => {
    setForm((current) => ({ ...current, organizationId, parentId: "" }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await onSubmit(form)) {
      setForm((current) => ({
        ...emptyServiceUnit,
        organizationId: current.organizationId,
      }));
    }
  };

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
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <FieldLabel htmlFor="unit-organization">
                Organisasi induk
              </FieldLabel>
              <ComboboxField
                id="unit-organization"
                value={form.organizationId}
                onChange={handleOrganizationChange}
                placeholder="Pilih organisasi"
                options={organizations.map((organization) => ({
                  value: organization.id,
                  label: `${organization.code} - ${organization.name}`,
                }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="unit-code">Kode unit</FieldLabel>
                <Input
                  id="unit-code"
                  value={form.code}
                  onChange={(event) => update("code", event.target.value)}
                  placeholder="POLI-UMUM"
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="unit-type">Jenis unit</FieldLabel>
                <SelectField
                  id="unit-type"
                  value={form.type}
                  onChange={(value) =>
                    update("type", value as ServiceUnitFormValues["type"])
                  }
                >
                  {serviceUnitTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="unit-name">
                Nama unit layanan
              </FieldLabel>
              <Input
                id="unit-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Poli Umum"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="unit-parent">Unit induk (opsional)</FieldLabel>
              <ComboboxField
                id="unit-parent"
                value={form.parentId}
                disabled={!form.organizationId}
                onChange={(parentId) => update("parentId", parentId)}
                placeholder="Tidak ada"
                options={serviceUnitParents.map((unit) => ({
                  value: unit.id,
                  label: `${unit.code} - ${unit.name}`,
                }))}
              />
            </div>
            <div>
              <FieldLabel htmlFor="unit-active">Status</FieldLabel>
              <SelectField
                id="unit-active"
                value={form.active ? "true" : "false"}
                onChange={(value) => update("active", value === "true")}
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </SelectField>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {onCancel ? (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Batal
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={submitting !== null || !form.organizationId}
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
