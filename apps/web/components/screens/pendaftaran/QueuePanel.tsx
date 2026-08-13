'use client';

import { useState } from 'react';
import { EncounterStatus } from '@mitrafaskes/shared';
import type { Encounter, ListMeta } from '@mitrafaskes/shared';
import {
  Clock3,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationControl } from '@/components/ui/pagination';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';
import type { EncounterApiError } from './useEncounterActions';

type QueuePanelProps = {
  encounters: Encounter[];
  meta: ListMeta;
  encountersLoading: boolean;
  encountersError: string;
  onPageChange: (page: number) => void;
  onStatusChange: (encounter: Encounter, status: EncounterStatus) => Promise<void>;
  onSyncEncounter: (encounter: Encounter) => void;
  canStart: boolean;
  canCancel: boolean;
  canSync: boolean;
};

const statusLabels: Record<EncounterStatus, string> = {
  WAITING: 'MENUNGGU',
  IN_PROGRESS: 'DIPERIKSA',
  COMPLETED: 'SELESAI',
  CANCELLED: 'DIBATALKAN',
};

function statusClass(status: EncounterStatus): string {
  if (status === 'WAITING') {
    return 'clinical-status-warning border text-[11px] font-bold';
  }
  if (status === 'IN_PROGRESS') {
    return 'border-primary/20 bg-primary/10 text-[11px] font-bold text-primary';
  }
  if (status === 'CANCELLED') {
    return 'clinical-status-error border text-[11px] font-bold';
  }
  return 'clinical-status-success border text-[11px] font-bold';
}

function transitionErrorMessage(error: unknown): string {
  const typedError = error as EncounterApiError;
  if (typedError.code === 'ENCOUNTER_VERSION_CONFLICT') {
    return 'Data antrean sudah berubah oleh pengguna lain. Daftar antrean sudah dimuat ulang; coba aksi lagi.';
  }
  return error instanceof Error
    ? error.message
    : 'Status kunjungan belum dapat diperbarui.';
}

export function QueuePanel({
  encounters,
  meta,
  encountersLoading,
  encountersError,
  onPageChange,
  onStatusChange,
  onSyncEncounter,
  canStart,
  canCancel,
  canSync,
}: QueuePanelProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  const transition = async (encounter: Encounter, status: EncounterStatus) => {
    setUpdatingId(encounter.id);
    try {
      await onStatusChange(encounter, status);
    } catch (error) {
      toast.error('Status kunjungan belum berubah', {
        description: transitionErrorMessage(error),
        duration: 7000,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section id="antrean-aktif" className="data-surface scroll-mt-24" aria-labelledby="queue-title">
      <div className="data-toolbar">
        <div>
          <h2 id="queue-title" className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Antrean rawat jalan hari ini
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Nomor antrean dan Encounter stabil di database lokal; perubahan status mengikuti lifecycle kunjungan.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/25 bg-primary/5 font-mono text-primary">
          {meta.total} antrean
        </Badge>
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
            <ScreenState kind="empty" title="Antrean masih kosong" description="Pasien yang didaftarkan ke poli akan muncul di sini." />
          </div>
        ) : encounters.map((encounter) => {
          const isUpdating = updatingId === encounter.id;
          const canCancelThis = canCancel && (encounter.status === 'WAITING' || encounter.status === 'IN_PROGRESS');
          const canStartThis = canStart && encounter.status === 'WAITING';
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
                    <span>Location: <strong className="text-foreground">{encounter.location?.name ?? 'Belum tersedia'}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex min-w-[12rem] flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
                <Badge className={statusClass(encounter.status)}>
                  {statusLabels[encounter.status]}
                </Badge>
                <SatusehatLinkageBadge
                  linkage={satusehatLinkage}
                  resourceName={encounter.encounterNumber}
                />
                <div className="flex items-center gap-1" role="group" aria-label={`Aksi lifecycle ${encounter.encounterNumber}`}>
                  {canStartThis ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      disabled={isUpdating}
                      onClick={() => void transition(encounter, EncounterStatus.IN_PROGRESS)}
                      aria-label={`Mulai pemeriksaan ${encounter.encounterNumber}`}
                      title={isUpdating ? 'Memperbarui status...' : 'Mulai pemeriksaan'}
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  ) : null}
                  {canCancelThis ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={isUpdating}
                      onClick={() => void transition(encounter, EncounterStatus.CANCELLED)}
                      aria-label={`Batalkan Encounter ${encounter.encounterNumber}`}
                      title={isUpdating ? 'Memperbarui status...' : 'Batalkan Encounter'}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  ) : null}
                  <SatusehatActionGroup
                    resourceName={encounter.encounterNumber}
                    onSync={() => onSyncEncounter(encounter)}
                    syncDisabled={!canSync}
                    syncDisabledReason="Peran Anda tidak memiliki izin sinkronisasi Encounter."
                  />
                </div>
                {latestSync?.status === 'FAILED' ? (
                  <p
                    className="basis-full text-right text-[11px] text-destructive"
                    role="status"
                    title={latestSync.errorMessage}
                  >
                    Sync terakhir gagal · buka aksi SATUSEHAT untuk detail
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 ? (
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Halaman {meta.page} dari {totalPages} · {meta.total} antrean
          </span>
          <PaginationControl
            page={meta.page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={encountersLoading || Boolean(updatingId)}
            showLabels={false}
            aria-label="Navigasi halaman antrean pendaftaran"
            className="mx-0 w-auto"
          />
        </div>
      ) : null}
    </section>
  );
}
