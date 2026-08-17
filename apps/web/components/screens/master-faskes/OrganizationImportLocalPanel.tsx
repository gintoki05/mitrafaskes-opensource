"use client";

import type {
  OrganizationSummary,
  SatusehatOrganizationRemoteSummary,
} from "@mitrafaskes/shared";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel, SelectField } from "./FormField";
import { OrganizationHierarchyBadge } from "./OrganizationHierarchyBadge";

type OrganizationImportLocalPanelProps = {
  selected: SatusehatOrganizationRemoteSummary;
  parentOptions: OrganizationSummary[];
  code: string;
  localParentId: string;
  canWrite: boolean;
  importing: boolean;
  onCodeChange: (value: string) => void;
  onLocalParentChange: (value: string) => void;
  onImport: () => void;
};

export function OrganizationImportLocalPanel({
  selected,
  parentOptions,
  code,
  localParentId,
  canWrite,
  importing,
  onCodeChange,
  onLocalParentChange,
  onImport,
}: OrganizationImportLocalPanelProps) {
  const requiresLocalParent = Boolean(selected.parentExternalResourceId);
  const codeLabel = requiresLocalParent
    ? "Kode organisasi di aplikasi"
    : "Kode faskes di aplikasi";
  const codePlaceholder = requiresLocalParent
    ? "Contoh: POLI-UMUM"
    : "Contoh: FASKES-UTAMA";
  const codeHelp = requiresLocalParent
    ? "Gunakan huruf, angka, titik, atau tanda hubung tanpa spasi. Misalnya POLI-UMUM. Ini kode internal aplikasi, bukan ID SATUSEHAT."
    : "Gunakan huruf, angka, titik, atau tanda hubung tanpa spasi. Misalnya FASKES-UTAMA. Ini kode internal aplikasi, bukan ID SATUSEHAT.";

  return (
    <section
      className="space-y-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"
      aria-labelledby="organization-import-local-title"
    >
      <div>
        <h3
          id="organization-import-local-title"
          className="text-sm font-bold text-foreground"
        >
          2. Simpan ke Master Faskes
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Data nama, status, alamat, dan kontak akan diambil dari SATUSEHAT.
          Anda hanya perlu memberi kode untuk penggunaan di aplikasi.
        </p>
      </div>

      <div className="rounded-[var(--radius-control)] border border-border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-foreground">
            {selected.name}
          </p>
          <OrganizationHierarchyBadge
            isRoot={!selected.parentExternalResourceId}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {requiresLocalParent
            ? `Induk di SATUSEHAT: ${selected.parentDisplay || "Tidak diketahui"}`
            : "Tidak memiliki induk di SATUSEHAT; data ini adalah root."}
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="satusehat-import-organization-id">
          ID SATUSEHAT
        </FieldLabel>
        <Input
          id="satusehat-import-organization-id"
          value={selected.externalResourceId}
          readOnly
          className="font-mono"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          ID ini berasal dari resource Organization yang ditemukan; kode di
          bawah tetap kode lokal aplikasi.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="satusehat-import-code">{codeLabel}</FieldLabel>
        <Input
          id="satusehat-import-code"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          maxLength={64}
          placeholder={codePlaceholder}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">{codeHelp}</p>
      </div>

      {requiresLocalParent ? (
        <div>
          <FieldLabel htmlFor="satusehat-import-local-parent">
            Simpan di bawah organisasi lokal
          </FieldLabel>
          <SelectField
            id="satusehat-import-local-parent"
            value={localParentId}
            onChange={onLocalParentChange}
            aria-label="Organisasi lokal tempat data disimpan"
          >
            <option value="">Pilih organisasi induk</option>
            {parentOptions.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.code} - {organization.name}
              </option>
            ))}
          </SelectField>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Pilih organisasi lokal yang sama dengan induk di SATUSEHAT.
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={onImport}
        disabled={
          !canWrite || importing || Boolean(selected.linkedLocalResourceId)
        }
        aria-busy={importing}
        className="w-full sm:w-auto"
      >
        {importing ? (
          <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {importing ? "Menyimpan..." : "Simpan ke Master Faskes"}
      </Button>
    </section>
  );
}
