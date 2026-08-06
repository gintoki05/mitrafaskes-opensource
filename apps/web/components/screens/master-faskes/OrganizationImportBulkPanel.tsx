import type {
  OrganizationSummary,
  SatusehatOrganizationRemoteSummary,
} from "@mitrafaskes/shared";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel, SelectField } from "./FormField";
import { OrganizationHierarchyBadge } from "./OrganizationHierarchyBadge";

type OrganizationImportBulkPanelProps = {
  items: SatusehatOrganizationRemoteSummary[];
  parentOptions: OrganizationSummary[];
  codes: Record<string, string>;
  localParentId: string;
  canWrite: boolean;
  importing: boolean;
  onCodeChange: (externalResourceId: string, value: string) => void;
  onLocalParentChange: (value: string) => void;
  onImport: () => void;
};

export function OrganizationImportBulkPanel({
  items,
  parentOptions,
  codes,
  localParentId,
  canWrite,
  importing,
  onCodeChange,
  onLocalParentChange,
  onImport,
}: OrganizationImportBulkPanelProps) {
  const requiresLocalParent = items.some(
    (item) => item.parentExternalResourceId,
  );

  return (
    <section
      className="space-y-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"
      aria-labelledby="organization-import-bulk-title"
    >
      <div>
        <h3
          id="organization-import-bulk-title"
          className="text-sm font-bold text-foreground"
        >
          Simpan {items.length} organisasi ke Master Faskes
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pastikan setiap organisasi memiliki kode lokal yang berbeda. Data akan
          disimpan satu per satu dan hasil yang gagal dapat dicoba lagi.
        </p>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.externalResourceId}
            className="grid gap-2 rounded-[var(--radius-control)] border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] sm:items-end"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xs font-semibold text-foreground">
                  {item.name}
                </p>
                <OrganizationHierarchyBadge
                  isRoot={!item.parentExternalResourceId}
                />
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {item.identifiers[0]?.value || item.externalResourceId}
              </p>
            </div>
            <div>
              <FieldLabel
                htmlFor={`satusehat-bulk-code-${item.externalResourceId}`}
              >
                Kode lokal
              </FieldLabel>
              <Input
                id={`satusehat-bulk-code-${item.externalResourceId}`}
                value={codes[item.externalResourceId] ?? ""}
                onChange={(event) =>
                  onCodeChange(item.externalResourceId, event.target.value)
                }
                maxLength={64}
                placeholder="Contoh: RAWAT-JALAN"
              />
            </div>
          </div>
        ))}
      </div>

      {requiresLocalParent ? (
        <div>
          <FieldLabel htmlFor="satusehat-import-bulk-parent">
            Simpan di bawah organisasi lokal
          </FieldLabel>
          <SelectField
            id="satusehat-import-bulk-parent"
            value={localParentId}
            onChange={onLocalParentChange}
            aria-label="Organisasi lokal tempat data dipilih disimpan"
          >
            <option value="">Pilih organisasi induk</option>
            {parentOptions.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.code} - {organization.name}
              </option>
            ))}
          </SelectField>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Parent lokal harus sesuai dengan induk Organization di SATUSEHAT.
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={onImport}
        disabled={!canWrite || importing}
        aria-busy={importing}
        className="w-full sm:w-auto"
      >
        {importing ? (
          <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {importing ? "Menyimpan..." : `Simpan ${items.length} data`}
      </Button>
    </section>
  );
}
