'use client';

import type { FormEvent, ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
  Search,
} from 'lucide-react';
import type {
  MasterDataListMeta,
  MasterDataListSort,
  MasterDataSortDirection,
} from '@mitrafaskes/shared';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type MasterFaskesTableProps<TData> = {
  caption: string;
  emptyTitle: string;
  emptyDescription: string;
  data: TData[];
  columns: ColumnDef<TData>[];
  meta: MasterDataListMeta;
  loading: boolean;
  error: string;
  search: string;
  searchLabel: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  filters?: ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onRefresh?: () => void;
  action?: ReactNode;
  sort?: MasterDataListSort;
  direction?: MasterDataSortDirection;
  onSortChange?: (
    sort: MasterDataListSort,
    direction: MasterDataSortDirection,
  ) => void;
  onPageChange: (page: number) => void;
};

export function MasterFaskesTable<TData>({
  caption,
  emptyTitle,
  emptyDescription,
  data,
  columns,
  meta,
  loading,
  error,
  search,
  searchLabel,
  onSearchChange,
  onSearchSubmit,
  filters,
  hasActiveFilters = false,
  onClearFilters,
  onRefresh,
  action,
  sort,
  direction,
  onSortChange,
  onPageChange,
}: MasterFaskesTableProps<TData>) {
  // TanStack Table owns a mutable table instance; React Compiler cannot safely memoize it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(meta.total / meta.pageSize)),
  });
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastItem = Math.min(meta.total, meta.page * meta.pageSize);

  const handleSort = (columnId: string) => {
    if (!onSortChange) return;
    const nextDirection =
      sort === columnId && direction === 'asc' ? 'desc' : 'asc';
    onSortChange(columnId as MasterDataListSort, nextDirection);
  };

  return (
    <section className="data-surface" aria-label={caption}>
      <div className="data-toolbar flex-wrap">
        <form
          onSubmit={onSearchSubmit}
          className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
        >
          <div className="relative min-w-0 flex-1 sm:max-w-xl">
            <label htmlFor={`master-search-${caption}`} className="sr-only">
              {searchLabel}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={`master-search-${caption}`}
              type="search"
              placeholder={searchLabel}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Button type="submit" className="sm:h-10 sm:px-4">
            Cari data
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              title="Hapus semua filter"
            >
              <FilterX className="h-4 w-4" aria-hidden="true" />
              Bersihkan
            </Button>
          ) : null}
          {onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              aria-busy={loading}
            >
              <RefreshCw
                className={loading ? 'h-4 w-4 motion-safe:animate-spin' : 'h-4 w-4'}
                aria-hidden="true"
              />
              Muat ulang
            </Button>
          ) : null}
          {action}
        </div>
      </div>

      {error ? (
        <div className="p-4">
          <ScreenState
            kind="error"
            title="Data master tidak dapat dimuat"
            description={error}
            compact
            action={
              onRefresh ? (
                <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
                  Coba lagi
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : null}

      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-muted/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder ? null : header.column.getCanSort() &&
                    onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex min-h-8 items-center gap-1 rounded px-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleSort(header.column.id)}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <ArrowDownUp
                        className="h-3.5 w-3.5 text-primary"
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-4">
                <ScreenState
                  kind="loading"
                  title={`Memuat ${caption.toLowerCase()}`}
                  description="Mohon tunggu sebentar."
                  compact
                />
              </TableCell>
            </TableRow>
          ) : data.length === 0 && !error ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-4">
                <ScreenState
                  kind="empty"
                  title={emptyTitle}
                  description={emptyDescription}
                />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span>
            Menampilkan{' '}
            <strong className="text-foreground">
              {firstItem}-{lastItem}
            </strong>{' '}
            dari <strong className="text-foreground">{meta.total}</strong> data
          </span>
          <Badge variant="outline" className="font-mono text-[10px]">
            Halaman {meta.page}/{totalPages}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={loading || meta.page <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={loading || meta.page >= totalPages}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
