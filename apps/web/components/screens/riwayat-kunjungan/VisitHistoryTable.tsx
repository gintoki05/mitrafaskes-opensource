'use client';

import { Eye, RefreshCw } from 'lucide-react';
import { EncounterStatus } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationControl } from '@/components/ui/pagination';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';
import {
  encounterStatusLabels,
  formatVisitDate,
  statusClass,
} from './constants';
import type { VisitHistoryTableProps } from './types';
import { resolveVisitHistoryTableState } from './visit-history-state';

export function VisitHistoryTable({
  encounters,
  meta,
  loading,
  error,
  canSync,
  satusehatAvailable,
  onPageChange,
  onRetry,
  onView,
  onSync,
}: VisitHistoryTableProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastItem = Math.min(meta.total, meta.page * meta.pageSize);
  const tableState = resolveVisitHistoryTableState({
    loading,
    error,
    itemCount: encounters.length,
  });

  return (
    <section className="data-surface" aria-label="Tabel riwayat kunjungan">
      <div className="data-toolbar">
        <div>
          <h2 className="text-sm font-bold text-foreground">Daftar riwayat kunjungan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Riwayat Encounter lokal berdasarkan rentang tanggal yang dipilih.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/25 bg-primary/5 font-mono text-primary">
          {meta.total} kunjungan
        </Badge>
      </div>
      <Table className="min-w-[980px]">
        <TableCaption className="sr-only">Daftar riwayat kunjungan pasien</TableCaption>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. kunjungan</TableHead>
            <TableHead>Antrean</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead>Dokter</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SATUSEHAT</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableState === 'loading' ? (
              <TableRow>
                <TableCell colSpan={9} className="p-4">
                  <ScreenState kind="loading" title="Memuat riwayat kunjungan" description="Mohon tunggu sebentar." compact />
                </TableCell>
              </TableRow>
            ) : tableState === 'error' ? (
              <TableRow>
                <TableCell colSpan={9} className="p-4">
                  <ScreenState
                    kind="error"
                    title="Riwayat kunjungan belum tersedia"
                    description={error}
                    compact
                    action={(
                      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Coba lagi
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : tableState === 'empty' ? (
              <TableRow>
                <TableCell colSpan={9} className="p-4">
                  <ScreenState
                    kind="empty"
                    title="Belum ada riwayat kunjungan"
                    description="Tidak ada Encounter pada rentang dan filter yang dipilih."
                  />
                </TableCell>
              </TableRow>
            ) : encounters.map((encounter) => {
              const latestSync = getLatestIntegrationSync(encounter.integrations, 'SATUSEHAT');
              return (
                <TableRow key={encounter.id}>
                  <TableCell className="whitespace-nowrap px-4 py-4 align-top text-xs text-foreground">
                    {formatVisitDate(encounter.queueDate)}
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    <span className="font-mono text-xs font-semibold text-foreground">{encounter.encounterNumber}</span>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    <Badge variant="outline" className="font-mono text-xs text-primary">#{encounter.queueNumber}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    <div className="font-semibold text-foreground">{encounter.patient?.fullName ?? 'Pasien tanpa nama'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{encounter.patient?.medicalRecNo ?? 'No. RM belum tersedia'}</div>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top text-xs text-foreground">
                    {encounter.doctor?.fullName ?? 'Belum tersedia'}
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top text-xs text-foreground">
                    {encounter.location?.name ?? 'Belum tersedia'}
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    <Badge className={statusClass(encounter.status as EncounterStatus)}>
                      {encounterStatusLabels[encounter.status as EncounterStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    {satusehatAvailable ? (
                      <>
                        <SatusehatLinkageBadge
                          linkage={getIntegrationLinkage(encounter.integrations, 'SATUSEHAT')}
                          resourceName={encounter.encounterNumber}
                        />
                        {latestSync?.status === 'FAILED' ? (
                          <p className="mt-1 max-w-[12rem] text-[11px] text-destructive" title={latestSync.errorMessage}>
                            Sync terakhir gagal
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Tidak tersedia</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-1" role="group" aria-label={`Aksi ${encounter.encounterNumber}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onView(encounter)}
                        aria-label={`Lihat detail ${encounter.encounterNumber}`}
                        title={`Lihat detail ${encounter.encounterNumber}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      {satusehatAvailable ? (
                        <SatusehatActionGroup
                          resourceName={encounter.encounterNumber}
                          onSync={() => onSync(encounter)}
                          syncDisabled={!canSync}
                          syncDisabledReason="Peran Anda tidak memiliki izin sinkronisasi Encounter."
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan <strong className="text-foreground">{firstItem}-{lastItem}</strong> dari <strong className="text-foreground">{meta.total}</strong> kunjungan
        </span>
        {totalPages > 1 ? (
          <PaginationControl
            page={meta.page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={loading}
            showLabels={false}
            aria-label="Navigasi halaman riwayat kunjungan"
            className="mx-0 w-auto"
          />
        ) : null}
      </div>
    </section>
  );
}
