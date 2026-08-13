'use client';

import type { SubmitEvent } from 'react';
import { FilterX, Search } from 'lucide-react';
import { EncounterStatus } from '@mitrafaskes/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldLabel, SelectField } from '../master-faskes/FormField';
import type { VisitHistoryFilters as VisitHistoryFiltersValue } from './types';
import { visitHistoryStatusLabels } from './constants';

type VisitHistoryFiltersProps = {
  value: VisitHistoryFiltersValue;
  searchDraft: string;
  hasActiveFilters: boolean;
  onChange: (changes: Partial<VisitHistoryFiltersValue>) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function VisitHistoryFilters({
  value,
  searchDraft,
  hasActiveFilters,
  onChange,
  onSearchChange,
  onSearchSubmit,
  onClear,
}: VisitHistoryFiltersProps) {
  return (
    <section className="data-surface" aria-label="Filter riwayat kunjungan">
      <div className="data-toolbar flex-wrap">
        <form
          onSubmit={onSearchSubmit}
          className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1 sm:max-w-xl">
            <FieldLabel htmlFor="visit-history-search">Cari kunjungan</FieldLabel>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="visit-history-search"
                type="search"
                placeholder="Nama pasien, No. RM, NIK, atau nomor kunjungan"
                value={searchDraft}
                onChange={(event) => onSearchChange(event.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
          </div>
          <Button type="submit" className="sm:h-10 sm:px-4">
            Cari data
          </Button>
        </form>
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} title="Hapus semua filter">
            <FilterX className="h-4 w-4" aria-hidden="true" />
            Bersihkan
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-border bg-muted/20 p-4 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="visit-history-from-date">Tanggal mulai</FieldLabel>
          <Input
            id="visit-history-from-date"
            type="date"
            required
            value={value.fromDate}
            max={value.toDate}
            onChange={(event) => onChange({ fromDate: event.target.value })}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <FieldLabel htmlFor="visit-history-to-date">Tanggal akhir</FieldLabel>
          <Input
            id="visit-history-to-date"
            type="date"
            required
            value={value.toDate}
            min={value.fromDate}
            onChange={(event) => onChange({ toDate: event.target.value })}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <FieldLabel htmlFor="visit-history-status">Status kunjungan</FieldLabel>
          <SelectField
            id="visit-history-status"
            value={value.status}
            onChange={(status) => onChange({ status: status as VisitHistoryFiltersValue['status'] })}
            aria-label="Filter status kunjungan"
            className="h-9"
          >
            <option value="ALL">{visitHistoryStatusLabels.ALL}</option>
            {Object.values(EncounterStatus).map((status) => (
              <option key={status} value={status}>
                {visitHistoryStatusLabels[status]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </section>
  );
}
