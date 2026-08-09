'use client';

import { type SubmitEvent, useState } from 'react';
import { BookOpen, RefreshCw, Search, X } from 'lucide-react';
import { AccessPermission } from '@mitrafaskes/shared';
import { PageHeader } from '@/components/PageHeader';
import { RouteGuard } from '@/components/RouteGuard';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MasterDataSubnav } from '../MasterDataSubnav';
import { ICD10_DEFAULT_PAGE_SIZE, ICD10_PAGE_SIZE_OPTIONS } from './constants';
import { Icd10CatalogProvenance } from './Icd10CatalogProvenance';
import { Icd10CatalogTable } from './Icd10CatalogTable';
import type { Icd10CatalogQuery } from './types';
import { useIcd10Catalog } from './useIcd10Catalog';

const initialQuery: Icd10CatalogQuery = {
  search: '',
  page: 1,
  pageSize: ICD10_DEFAULT_PAGE_SIZE,
};

export default function Icd10CatalogScreen() {
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState('');
  const catalog = useIcd10Catalog(query);

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery((current) => ({
      ...current,
      search: searchDraft.trim(),
      page: 1,
    }));
  };

  const clearSearch = () => {
    setSearchDraft('');
    setQuery((current) => ({ ...current, search: '', page: 1 }));
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) return;
    setQuery((current) => ({
      ...current,
      page: 1,
      pageSize: Number(value),
    }));
  };

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<BookOpen className="h-6 w-6" />}
          title="Katalog ICD-10"
          description="Browser read-only untuk 18.543 kode ICD-10 dari snapshot lokal. Pencarian kode dan display dilayani oleh endpoint NestJS dengan pagination server-side."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => void catalog.refresh()}
              disabled={catalog.loading}
              aria-busy={catalog.loading}
            >
              <RefreshCw
                className={catalog.loading ? 'motion-safe:animate-spin' : undefined}
                aria-hidden="true"
              />
              Muat ulang lokal
            </Button>
          }
        />

        <MasterDataSubnav />

        <Icd10CatalogProvenance items={catalog.items} />

        <Card>
          <CardHeader className="border-b border-border/70">
            <CardTitle className="flex items-center gap-2">
              Daftar kode aktif
              <Badge variant="outline">ICD10_2010</Badge>
            </CardTitle>
            <CardDescription>
              Gunakan pencarian untuk mempersempit katalog. Hanya data lokal
              aktif yang ditampilkan; tidak ada operasi tulis di halaman ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <form
                onSubmit={handleSearchSubmit}
                className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end"
              >
                <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-foreground sm:max-w-2xl">
                  Cari kode atau display
                  <span className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="icd10-catalog-search"
                      type="search"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Contoh: A00 atau acute"
                      className="pl-9"
                    />
                  </span>
                </label>
                <Button type="submit">Cari kode</Button>
              </form>

              <label className="grid gap-1.5 text-xs font-semibold text-foreground sm:w-44">
                Record per halaman
                <Select
                  value={String(query.pageSize)}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger aria-label="Pilih jumlah record per halaman" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICD10_PAGE_SIZE_OPTIONS.map((pageSize) => (
                      <SelectItem key={pageSize} value={String(pageSize)}>
                        {pageSize} record
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            {query.search ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Filter aktif:</span>
                <Badge variant="secondary" className="font-mono">
                  {query.search}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearSearch}
                >
                  <X aria-hidden="true" />
                  Bersihkan
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] bg-muted/50 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {query.search
                  ? `Hasil pencarian untuk “${query.search}”`
                  : 'Menampilkan seluruh kode aktif dari snapshot lokal'}
              </span>
              <span className="font-semibold text-foreground">
                {catalog.meta.total.toLocaleString('id-ID')} kode aktif
              </span>
            </div>

            {catalog.error ? (
              <ScreenState
                kind="error"
                title="Katalog ICD-10 belum tersedia"
                description={catalog.error}
                compact
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void catalog.refresh()}
                  >
                    Coba lagi
                  </Button>
                }
              />
            ) : (
              <Icd10CatalogTable
                items={catalog.items}
                meta={catalog.meta}
                loading={catalog.loading}
                onPageChange={(page) =>
                  setQuery((current) => ({ ...current, page }))
                }
              />
            )}
          </CardContent>
        </Card>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Katalog ini hanya membaca snapshot lokal <code className="font-mono">ICD10_2010</code>.
          RME tetap memakai endpoint lookup yang sama, dengan hasil yang dibatasi
          server-side.
        </p>
      </div>
    </RouteGuard>
  );
}
