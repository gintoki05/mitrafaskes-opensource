'use client';

import { Heart, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Icd10Entry } from '@/lib/clinical-types';
import type { RmeDiagnosis } from './types';

type RmeDiagnosisSectionProps = {
  icdSearch: string;
  icdResults: Icd10Entry[];
  selectedDiagnoses: RmeDiagnosis[];
  onSearchChange: (value: string) => void;
  onAddDiagnosis: (icd: Icd10Entry) => void;
  onRemoveDiagnosis: (code: string) => void;
};

export function RmeDiagnosisSection({
  icdSearch,
  icdResults,
  selectedDiagnoses,
  onSearchChange,
  onAddDiagnosis,
  onRemoveDiagnosis,
}: RmeDiagnosisSectionProps) {
  return (
    <Card>
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
          />
        </div>

        {icdSearch && (
          <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-[var(--radius-card)] border border-input bg-background">
            {icdResults.map((icd) => (
              <button
                key={icd.code}
                type="button"
                onClick={() => onAddDiagnosis(icd)}
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
            <div key={diagnosis.icd10Code} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 font-mono text-xs font-bold text-primary">{diagnosis.icd10Code}</Badge>
                <span className="text-xs font-medium text-foreground">{diagnosis.nameIndo}</span>
                {diagnosis.isPrimary && <Badge className="clinical-status-success border text-[10px] font-bold">UTAMA</Badge>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveDiagnosis(diagnosis.icd10Code)}
                className="p-1 text-muted-foreground hover:text-destructive"
                aria-label={`Hapus diagnosis ${diagnosis.icd10Code}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
