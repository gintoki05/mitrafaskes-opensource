"use client";

import { type FormEvent, useState } from "react";
import { Building2, Save } from "lucide-react";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { emptyOrganization, organizationTypes } from "./constants";
import { FieldLabel, SelectField } from "./FormField";
import type {
  OrganizationForm as OrganizationFormValues,
  SubmitHandler,
  SubmittingKind,
} from "./types";

type OrganizationFormProps = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  submitting: SubmittingKind | null;
  onSubmit: SubmitHandler<OrganizationFormValues>;
};

export function OrganizationForm({
  canWrite,
  organizations,
  submitting,
  onSubmit,
}: OrganizationFormProps) {
  const [form, setForm] = useState(emptyOrganization);

  const update = <K extends keyof OrganizationFormValues>(
    field: K,
    value: OrganizationFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await onSubmit(form)) {
      setForm(emptyOrganization);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Building2 className="h-4 w-4 text-primary" />
          Organisasi / Faskes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {canWrite ? (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <FieldLabel htmlFor="organization-code">Kode master</FieldLabel>
              <Input
                id="organization-code"
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
                placeholder="KLINIK-UTAMA"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="organization-name">
                Nama organisasi / faskes
              </FieldLabel>
              <Input
                id="organization-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Klinik Mitra Sehat"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="organization-type">
                Jenis organisasi
              </FieldLabel>
              <SelectField
                id="organization-type"
                value={form.type}
                onChange={(value) =>
                  update("type", value as OrganizationFormValues["type"])
                }
              >
                {organizationTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel htmlFor="organization-parent">
                Organisasi induk (opsional)
              </FieldLabel>
              <SelectField
                id="organization-parent"
                value={form.parentId}
                onChange={(parentId) => update("parentId", parentId)}
              >
                <option value="">Tidak ada, sebagai induk</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.code} — {organization.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <div>
              <FieldLabel htmlFor="organization-address">Alamat</FieldLabel>
              <Input
                id="organization-address"
                value={form.addressText}
                onChange={(event) => update("addressText", event.target.value)}
                placeholder="Alamat faskes"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="organization-phone">Telepon</FieldLabel>
                <Input
                  id="organization-phone"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="021..."
                />
              </div>
              <div>
                <FieldLabel htmlFor="organization-email">Email</FieldLabel>
                <Input
                  id="organization-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="admin@..."
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting !== null}
              className="w-full text-xs font-bold"
            >
              <Save className="h-4 w-4" />
              {submitting === "organization"
                ? "Menyimpan..."
                : "Simpan organisasi"}
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
