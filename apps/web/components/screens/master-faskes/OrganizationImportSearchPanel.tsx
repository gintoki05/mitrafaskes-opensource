"use client";

import type { SubmitEvent } from "react";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel, SelectField } from "./FormField";

type OrganizationImportSearchPanelProps = {
  parentOptions: OrganizationSummary[];
  externalId: string;
  name: string;
  searchParentId: string;
  searching: boolean;
  onExternalIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSearchParentChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

export function OrganizationImportSearchPanel({
  parentOptions,
  externalId,
  name,
  searchParentId,
  searching,
  onExternalIdChange,
  onNameChange,
  onSearchParentChange,
  onSubmit,
}: OrganizationImportSearchPanelProps) {
  return (
    <section
      className="space-y-3"
      aria-labelledby="organization-import-search-title"
    >
      <div>
        <h3
          id="organization-import-search-title"
          className="text-sm font-bold text-foreground"
        >
          1. Cari organisasi di SATUSEHAT
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Biasanya cukup cari berdasarkan nama. Gunakan ID SATUSEHAT hanya jika
          ID tersebut sudah diketahui.
        </p>
      </div>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="satusehat-import-name">
              Nama organisasi / faskes
            </FieldLabel>
            <Input
              id="satusehat-import-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Contoh: Klinik Mitra Sehat"
            />
          </div>
          <div>
            <FieldLabel htmlFor="satusehat-import-id">
              ID SATUSEHAT (opsional)
            </FieldLabel>
            <Input
              id="satusehat-import-id"
              value={externalId}
              onChange={(event) => onExternalIdChange(event.target.value)}
              placeholder="Masukkan jika sudah diketahui"
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="satusehat-import-search-parent">
            Batasi pencarian di bawah organisasi ini (opsional)
          </FieldLabel>
          <SelectField
            id="satusehat-import-search-parent"
            value={searchParentId}
            onChange={onSearchParentChange}
            aria-label="Batasi pencarian di bawah organisasi lokal"
          >
            <option value="">Semua organisasi</option>
            {parentOptions.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.code} - {organization.name}
              </option>
            ))}
          </SelectField>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Jika organisasi induk dipilih, daftar suborganisasinya akan dimuat
            otomatis. Gunakan nama atau ID jika ingin mencari data tertentu.
          </p>
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={searching}
          aria-busy={searching}
        >
          {searching ? (
            <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? "Mencari..." : "Cari organisasi"}
        </Button>
      </form>
    </section>
  );
}
