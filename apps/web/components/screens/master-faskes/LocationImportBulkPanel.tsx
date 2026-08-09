import type {
  LocationSummary,
  SatusehatLocationRemoteSummary,
} from '@mitrafaskes/shared';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComboboxField } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { FieldLabel } from './FormField';

type LocationImportBulkPanelProps = {
  items: SatusehatLocationRemoteSummary[];
  parentOptions: LocationSummary[];
  codes: Record<string, string>;
  parentIds: Record<string, string>;
  canWrite: boolean;
  importing: boolean;
  onCodeChange: (externalResourceId: string, value: string) => void;
  onParentChange: (externalResourceId: string, value: string) => void;
  onImport: () => void;
};

export function LocationImportBulkPanel({
  items,
  parentOptions,
  codes,
  parentIds,
  canWrite,
  importing,
  onCodeChange,
  onParentChange,
  onImport,
}: LocationImportBulkPanelProps) {
  return (
    <section
      className="space-y-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"
      aria-labelledby="location-import-bulk-title"
    >
      <div>
        <h3
          id="location-import-bulk-title"
          className="text-sm font-bold text-foreground"
        >
          Simpan {items.length} Location ke Master Faskes
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Lengkapi kode lokal untuk setiap Location. Parent diatur per data
          agar struktur gedung atau ruangan tetap sesuai.
        </p>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const requiresParent = Boolean(item.parentExternalResourceId);
          return (
            <div
              key={item.externalResourceId}
              className="space-y-3 rounded-[var(--radius-control)] border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-xs font-semibold text-foreground">
                  {item.name}
                </p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {requiresParent
                    ? `Parent SATUSEHAT: ${item.parentDisplay || 'tersedia'}`
                    : 'Root Location'}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor={`satusehat-location-bulk-code-${item.externalResourceId}`}
                  >
                    Kode lokal
                  </FieldLabel>
                  <Input
                    id={`satusehat-location-bulk-code-${item.externalResourceId}`}
                    value={codes[item.externalResourceId] ?? ''}
                    onChange={(event) =>
                      onCodeChange(item.externalResourceId, event.target.value)
                    }
                    maxLength={64}
                    placeholder="Contoh: POLI-UMUM"
                  />
                </div>

                <div>
                  {requiresParent ? (
                    <>
                      <FieldLabel
                        htmlFor={`satusehat-location-bulk-parent-${item.externalResourceId}`}
                      >
                        Parent lokal
                      </FieldLabel>
                      <ComboboxField
                        id={`satusehat-location-bulk-parent-${item.externalResourceId}`}
                        value={parentIds[item.externalResourceId] ?? ''}
                        onChange={(value) =>
                          onParentChange(item.externalResourceId, value)
                        }
                        placeholder="Pilih parent Location"
                        clearable={false}
                        options={parentOptions.map((location) => ({
                          value: location.id,
                          label: `${location.code} - ${location.name}`,
                        }))}
                      />
                    </>
                  ) : (
                    <>
                      <p className="mb-1 block text-xs font-semibold text-foreground">
                        Parent lokal
                      </p>
                      <p className="clinical-field flex min-h-8 items-center px-2.5 py-1 text-sm text-muted-foreground">
                        Root Location
                      </p>
                    </>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Location bertingkat hanya dapat disimpan jika parent lokalnya sudah
        terhubung ke Location SATUSEHAT yang sesuai.
      </p>

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
        {importing ? 'Menyimpan...' : `Simpan ${items.length} data`}
      </Button>
    </section>
  );
}
