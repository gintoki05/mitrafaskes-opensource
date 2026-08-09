'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Icd10CatalogTableProps } from './types';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function Icd10CatalogTable({
  items,
  meta,
  loading,
  onPageChange,
}: Icd10CatalogTableProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastItem = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border" aria-busy={loading}>
      <Table>
        <TableCaption className="sr-only">
          Katalog kode ICD-10 lokal aktif
        </TableCaption>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Display resmi</TableHead>
            <TableHead>Alias lokal</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Source version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-4">
                <ScreenState
                  kind="loading"
                  title="Memuat katalog ICD-10"
                  description="Data dibaca dari snapshot database lokal."
                  compact
                />
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-4">
                <ScreenState
                  kind="empty"
                  title="Kode ICD-10 tidak ditemukan"
                  description="Ubah pencarian kode atau display untuk melihat hasil lain."
                  compact
                />
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.code}>
                <TableCell className="whitespace-nowrap font-mono text-xs font-bold text-primary">
                  {item.code}
                </TableCell>
                <TableCell className="min-w-64 max-w-xl">
                  <span className="font-semibold text-foreground">
                    {item.display}
                  </span>
                </TableCell>
                <TableCell className="min-w-48 max-w-sm text-xs text-muted-foreground">
                  {item.nameIndo || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {item.source}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {item.sourceVersion || '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Menampilkan{' '}
            <strong className="text-foreground">
              {firstItem.toLocaleString('id-ID')}-
              {lastItem.toLocaleString('id-ID')}
            </strong>{' '}
            dari{' '}
            <strong className="text-foreground">
              {meta.total.toLocaleString('id-ID')}
            </strong>{' '}
            kode aktif
          </span>
          <Badge variant="outline" className="font-mono text-[10px]">
            Halaman {meta.page}/{totalPages}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={loading || meta.page <= 1}
          >
            <ChevronLeft aria-hidden="true" />
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={loading || meta.page >= totalPages}
          >
            Berikutnya
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
