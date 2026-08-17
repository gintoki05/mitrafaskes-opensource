'use client';

import type { SatusehatLocationRemoteSummary } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PaginationControl } from '@/components/ui/pagination';
import { SatusehatLocationResult } from './SatusehatLocationResult';

type LocationImportResultsProps = {
  items: SatusehatLocationRemoteSummary[];
  selectedIds: string[];
  selectedId?: string;
  selectableCount: number;
  selectedCount: number;
  allSelectableSelected: boolean;
  someSelectableSelected: boolean;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalItems: number;
  onToggleAll: (checked: boolean) => void;
  onToggleItem: (item: SatusehatLocationRemoteSummary, checked: boolean) => void;
  onSelect: (item: SatusehatLocationRemoteSummary) => void;
  onPageChange: (page: number) => void;
};

export function LocationImportResults({
  items,
  selectedIds,
  selectedId,
  selectableCount,
  selectedCount,
  allSelectableSelected,
  someSelectableSelected,
  page,
  totalPages,
  pageStart,
  pageEnd,
  totalItems,
  onToggleAll,
  onToggleItem,
  onSelect,
  onPageChange,
}: LocationImportResultsProps) {
  return (
    <section
      className="space-y-2"
      aria-labelledby="location-import-results-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="location-import-results-title"
            className="text-sm font-bold text-foreground"
          >
            Pilih Location yang benar
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} Location dipilih`
              : 'Pilih satu, beberapa, atau semua Location yang belum terhubung.'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Checkbox
            checked={allSelectableSelected}
            indeterminate={someSelectableSelected}
            disabled={selectableCount === 0}
            onCheckedChange={onToggleAll}
            aria-label="Pilih semua Location yang belum terhubung"
          />
          {selectableCount > 0 ? 'Pilih semua' : 'Semua sudah terhubung'}
        </label>
      </div>

      {items.map((item) => (
        <SatusehatLocationResult
          key={item.externalResourceId}
          item={item}
          selected={selectedId === item.externalResourceId}
          checked={selectedIds.includes(item.externalResourceId)}
          onSelect={() => onSelect(item)}
          onCheckedChange={(checked) => onToggleItem(item, checked)}
        />
      ))}

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{' '}
              <strong className="text-foreground">
                {pageStart}-{pageEnd}
              </strong>{' '}
              dari <strong className="text-foreground">{totalItems}</strong>{' '}
              data
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              Halaman {page}/{totalPages}
            </Badge>
          </div>
          <PaginationControl
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            showLabels={false}
            aria-label="Navigasi halaman hasil import Location"
            className="mx-0 w-auto"
          />
        </div>
      ) : null}
    </section>
  );
}
