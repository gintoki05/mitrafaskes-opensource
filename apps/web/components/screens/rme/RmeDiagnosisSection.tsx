'use client';

import { Heart, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import type { Icd10Entry } from '@/lib/clinical-types';
import {
  getIntegrationLinkage,
  getLatestIntegrationSync,
} from '@/lib/integrations';
import type { RmeDiagnosis } from './types';

type RmeDiagnosisSectionProps = {
  icdSearch: string;
  icdResults: Icd10Entry[];
  selectedDiagnoses: RmeDiagnosis[];
  onSearchChange: (value: string) => void;
  onAddDiagnosis: (icd: Icd10Entry) => void;
  onRemoveDiagnosis: (code: string) => void;
  disabled: boolean;
  syncDisabled: boolean;
  syncDisabledReason?: string;
  canSyncDiagnosis: boolean;
  syncingDiagnosisId: string | null;
  onSyncDiagnosis: (id: string) => void;
};

export function RmeDiagnosisSection({
  icdSearch,
  icdResults,
  selectedDiagnoses,
  onSearchChange,
  onAddDiagnosis,
  onRemoveDiagnosis,
  disabled,
  syncDisabled,
  syncDisabledReason,
  canSyncDiagnosis,
  syncingDiagnosisId,
  onSyncDiagnosis,
}: RmeDiagnosisSectionProps) {
  return (
    <Card
      id="rme-section-diagnosis"
      className="scroll-mt-24"
      tabIndex={-1}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Heart className="h-4 w-4 text-destructive" />
          3. Diagnosis ICD-10 (Persyaratan Kemenkes)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <label htmlFor="icd-search" className="sr-only">Cari diagnosis ICD-10</label>
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="icd-search"
            type="text"
            value={icdSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari Kode atau Nama Penyakit ICD-10 (Contoh: J00, Diare, Hipertensi)..."
            className="pl-9 text-xs"
            disabled={disabled}
          />
        </div>

        {icdSearch && (
          <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-[var(--radius-card)] border border-input bg-background">
            {icdResults.map((icd) => (
              <button
                key={icd.code}
                type="button"
                onClick={() => onAddDiagnosis(icd)}
                disabled={disabled}
                className="flex w-full items-center justify-between p-2.5 text-left text-xs transition-colors hover:bg-muted"
              >
                <div>
                  <strong className="mr-2 font-mono text-primary">{icd.code}</strong>
                  <span className="text-foreground">{icd.nameIndo ?? icd.display}</span>
                </div>
                {icd.nameIndo && icd.nameIndo !== icd.display ? (
                  <span className="text-[10px] italic text-muted-foreground">{icd.display}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Diagnosis Terpilih:
          </label>
          {selectedDiagnoses.map((diagnosis) => (
            <div
              key={diagnosis.id ?? diagnosis.icd10Code}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 font-mono text-xs font-bold text-primary">
                    {diagnosis.icd10Code}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {diagnosis.nameIndo}
                  </span>
                  {diagnosis.isPrimary && (
                    <Badge className="clinical-status-success border text-[10px] font-bold">
                      UTAMA
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SatusehatLinkageBadge
                    linkage={getIntegrationLinkage(
                      diagnosis.integrations,
                      'SATUSEHAT',
                    )}
                    resourceName={diagnosis.icd10Code}
                  />
                  {getLatestIntegrationSync(diagnosis.integrations, 'SATUSEHAT')
                    ?.status === 'FAILED' ? (
                    <span
                      className="text-[11px] font-semibold text-destructive"
                      title={
                        getLatestIntegrationSync(
                          diagnosis.integrations,
                          'SATUSEHAT',
                        )?.errorMessage
                      }
                    >
                      Sync terakhir gagal
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {diagnosis.id ? (
                  <SatusehatActionGroup
                    resourceName={diagnosis.icd10Code}
                    onSync={() => onSyncDiagnosis(diagnosis.id!)}
                    syncDisabled={
                      syncDisabled ||
                      !canSyncDiagnosis ||
                      syncingDiagnosisId === diagnosis.id
                    }
                    syncDisabledReason={
                      syncingDiagnosisId === diagnosis.id
                        ? 'Sinkronisasi diagnosis sedang berjalan.'
                        : syncDisabled
                          ? (syncDisabledReason ??
                            'Simpan perubahan lokal sebelum sinkronisasi.')
                          : !canSyncDiagnosis
                            ? 'Anda tidak memiliki izin sync.retry.'
                            : undefined
                    }
                  />
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Simpan draft untuk sinkronisasi
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDiagnosis(diagnosis.icd10Code)}
                  disabled={disabled}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label={`Hapus diagnosis ${diagnosis.icd10Code}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {selectedDiagnoses.length === 0 ? (
            <p className="rounded-[var(--radius-control)] border border-dashed border-border p-3 text-xs text-muted-foreground">
              Belum ada diagnosis. Cari ICD-10 untuk menambahkan diagnosis saat data klinis tersedia.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
