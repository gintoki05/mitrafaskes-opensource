'use client';

import { useState } from 'react';
import { EncounterStatus } from '@mitrafaskes/shared';
import type {
  Encounter,
  EncounterStatusCounts,
  ListMeta,
} from '@mitrafaskes/shared';
import { Clock3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationControl } from '@/components/ui/pagination';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import {
  getSatusehatEncounterStatus,
  getSatusehatEncounterStatusTooltip,
} from '@/components/satusehat/satusehat-status';
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';
import { EncounterQueueActions } from './EncounterQueueActions';
import {
  getQueueCountLabel,
  getQueueStatusLabel,
  QueueStatusFilter,
  type QueueStatusFilterValue,
} from './QueueStatusFilter';

type QueuePanelProps = {
  encounters: Encounter[];
  meta: ListMeta;
  statusCounts: EncounterStatusCounts;
  encountersLoading: boolean;
  encountersError: string;
  statusFilter: QueueStatusFilterValue;
  onStatusFilterChange: (filter: QueueStatusFilterValue) => void;
  onPageChange: (page: number) => void;
  onStatusChange: (
    encounter: Encounter,
    status: EncounterStatus,
    reason?: string,
  ) => Promise<void>;
  onSyncEncounter: (encounter: Encounter) => void;
  canStart: boolean;
  canCancel: boolean;
  canPause: boolean;
  canCorrect: boolean;
  canSync: boolean;
};

function statusClass(status: EncounterStatus): string {
  if (status === EncounterStatus.ARRIVED || status === EncounterStatus.ONLEAVE) {
    return 'clinical-status-warning border text-xs font-semibold';
  }
  if (status === EncounterStatus.IN_PROGRESS) {
    return 'border-primary/20 bg-primary/10 text-xs font-semibold text-primary';
  }
  if (
    status === EncounterStatus.CANCELLED ||
    status === EncounterStatus.ENTERED_IN_ERROR
  ) {
    return 'clinical-status-error border text-xs font-semibold';
  }
  return 'clinical-status-success border text-xs font-semibold';
}

export function QueuePanel({
  encounters,
  meta,
  statusCounts,
  encountersLoading,
  encountersError,
  statusFilter,
  onStatusFilterChange,
  onPageChange,
  onStatusChange,
  onSyncEncounter,
  canStart,
  canCancel,
  canPause,
  canCorrect,
  canSync,
}: QueuePanelProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastItem = Math.min(meta.total, meta.page * meta.pageSize);

  const transition = async (
    encounter: Encounter,
    status: EncounterStatus,
    reason?: string,
  ) => {
    setUpdatingId(encounter.id);
    try {
      await onStatusChange(encounter, status, reason);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section id="antrean-aktif" className="data-surface scroll-mt-24" aria-labelledby="queue-title">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 id="queue-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Antrean rawat jalan hari ini
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Status antrean mengikuti tahapan kunjungan.
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          <strong className="font-mono text-foreground">{meta.total}</strong>{' '}
          {getQueueCountLabel(statusFilter)}
        </span>
      </div>
      <div className="data-toolbar">
        <QueueStatusFilter
          value={statusFilter}
          statusCounts={statusCounts}
          disabled={encountersLoading || Boolean(updatingId)}
          onChange={onStatusFilterChange}
        />
      </div>
      <div className="divide-y divide-border">
        {encountersLoading ? (
          <div className="p-4">
            <ScreenState kind="loading" title="Memuat antrean" description="Mohon tunggu sebentar." compact />
          </div>
        ) : encounters.length === 0 && encountersError ? (
          <div className="p-4">
            <ScreenState
              kind="error"
              title="Antrean belum tersedia"
              description={encountersError}
              compact
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(meta.page)}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Coba lagi
                </Button>
              }
            />
          </div>
        ) : encounters.length === 0 ? (
          <div className="p-4">
            <ScreenState
              kind="empty"
              title={
                statusFilter === 'ACTIVE'
                  ? 'Antrean aktif masih kosong'
                  : 'Tidak ada kunjungan ' + getQueueStatusLabel(statusFilter).toLowerCase()
              }
              description={
                statusFilter === 'ACTIVE'
                  ? 'Pasien yang didaftarkan ke poli akan muncul di sini.'
                  : 'Pilih status lain untuk melihat kunjungan yang tersedia.'
              }
            />
          </div>
        ) : encounters.map((encounter) => {
          const isUpdating = updatingId === encounter.id;
          const satusehatLinkage = getIntegrationLinkage(
            encounter.integrations,
            'SATUSEHAT',
          );
          const latestSync = getLatestIntegrationSync(
            encounter.integrations,
            'SATUSEHAT',
          );

          return (
            <div key={encounter.id} className="flex min-w-0 flex-wrap items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-primary/[0.035] sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-sm font-bold text-primary-foreground">
                  {encounter.queueNumber}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">
                    {encounter.patient?.fullName ?? 'Pasien tanpa nama'}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{encounter.encounterNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{encounter.patient?.medicalRecNo ?? 'Nomor RM belum tersedia'}</span>
                  </div>
                  <div className="mt-2 grid gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <span>Dokter: <strong className="text-foreground">{encounter.doctor?.fullName ?? 'Belum tersedia'}</strong></span>
                    <span>Lokasi: <strong className="text-foreground">{encounter.location?.name ?? 'Belum tersedia'}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex basis-full w-full min-w-0 flex-1 flex-wrap items-center justify-start gap-2 sm:basis-auto sm:w-auto sm:min-w-[12rem] sm:flex-none sm:justify-end">
                <Badge
                  className={statusClass(encounter.status)}
                  title={getSatusehatEncounterStatusTooltip(encounter.status)}
                >
                  {getSatusehatEncounterStatus(encounter.status)}
                </Badge>
                <SatusehatLinkageBadge
                  linkage={satusehatLinkage}
                  latestSync={latestSync}
                  resourceName={encounter.encounterNumber}
                />
                <EncounterQueueActions
                  encounter={encounter}
                  updating={isUpdating}
                  canStart={canStart}
                  canCancel={canCancel}
                  canPause={canPause}
                  canCorrect={canCorrect}
                  canSync={canSync}
                  onStatusChange={transition}
                  onSync={() => onSyncEncounter(encounter)}
                />
                {latestSync?.status === 'FAILED' ? (
                  <p
                    className="basis-full text-left text-[11px] text-destructive sm:text-right"
                    role="status"
                    title={latestSync.errorMessage}
                  >
                    Sinkronisasi terakhir gagal · buka aksi SATUSEHAT untuk melihat detail
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan <strong className="text-foreground">{firstItem}-{lastItem}</strong>{' '}
          dari <strong className="text-foreground">{meta.total}</strong>{' '}
          {getQueueCountLabel(statusFilter)}
        </span>
        {totalPages > 1 ? (
          <PaginationControl
            page={meta.page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={encountersLoading || Boolean(updatingId)}
            showLabels={false}
            aria-label="Navigasi halaman antrean pendaftaran"
            className="mx-0 w-auto"
          />
        ) : null}
      </div>
    </section>
  );
}
