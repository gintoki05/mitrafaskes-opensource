"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Layers3, Save } from "lucide-react";
import type { OrganizationSummary, ServiceUnitSummary } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { emptyServiceUnit, serviceUnitTypes } from "./constants";
import { FieldLabel, SelectField } from "./FormField";
import type {
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
};

export function ServiceUnitForm({
  canWrite,
  organizations,
  serviceUnits,
  submitting,
  onSubmit,
}: ServiceUnitFormProps) {
  const [form, setForm] = useState(emptyServiceUnit);
  const serviceUnitParents = useMemo(
    () =>
      serviceUnits.filter(
        (unit) => unit.organizationId === form.organizationId,
      ),
    [form.organizationId, serviceUnits],
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
              <SelectField
                id="unit-organization"
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
              <SelectField
                id="unit-parent"
                value={form.parentId}
                disabled={!form.organizationId}
                onChange={(parentId) => update("parentId", parentId)}
              >
                <option value="">Tidak ada</option>
                {serviceUnitParents.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} — {unit.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button
              type="submit"
              disabled={submitting !== null || !form.organizationId}
              className="w-full text-xs font-bold"
            >
              <Save className="h-4 w-4" />
              {submitting === "unit"
                ? "Menyimpan..."
                : "Simpan unit layanan"}
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
