'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PaginationControl } from '@/components/ui/pagination';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import {
  getSatusehatEncounterStatus,
  getSatusehatEncounterStatusTooltip,
} from '@/components/satusehat/satusehat-status';
import { ListChecks, PanelLeftClose, PanelLeftOpen, RefreshCw, RotateCcw } from 'lucide-react';
import { EncounterStatus } from '@mitrafaskes/shared';
import type { ListMeta } from '@mitrafaskes/shared';
import type { Encounter } from '@/lib/clinical-types';
import { formatEncounterQueueDate } from '@/lib/encounter-display';

type RmeEncounterQueueProps = {
  encounters: Encounter[];
  meta: ListMeta;
  selectedEncounter: Encounter | null;
  isOpen: boolean;
  encountersLoading: boolean;
  loadError: string;
  onSelectEncounter: (encounter: Encounter) => void;
  onOpenChange: (open: boolean) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  canStart: boolean;
  startingEncounterId: string | null;
  onStartEncounter: (encounter: Encounter) => void;
  canPause: boolean;
  transitioningEncounterId: string | null;
  onResumeEncounter: (encounter: Encounter) => void;
};

export function RmeEncounterQueue({
  encounters,
  meta,
  selectedEncounter,
  isOpen,
  encountersLoading,
  loadError,
  onSelectEncounter,
  onOpenChange,
  onPageChange,
  onRetry,
  canStart,
  startingEncounterId,
  onStartEncounter,
  canPause,
  transitioningEncounterId,
  onResumeEncounter,
}: RmeEncounterQueueProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const selectedPatientName = selectedEncounter?.patient?.fullName ?? 'Belum ada pasien dipilih';
  const selectedPatientMeta = selectedEncounter
    ? `${selectedEncounter.patient?.medicalRecNo ?? 'No. RM belum tersedia'} · #${selectedEncounter.queueNumber} · ${formatEncounterQueueDate(selectedEncounter.queueDate)}`
    : 'Buka antrean untuk memilih pasien';
  const queueCountLabel = meta.total === 0 ? 'Tidak ada antrean aktif' : `${meta.total} antrean aktif`;

  if (!isOpen) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
              <ListChecks className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Antrean pasien
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{selectedPatientName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedPatientMeta} · {queueCountLabel}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(true)}
            aria-expanded={false}
            aria-controls="rme-encounter-queue-panel"
          >
            <PanelLeftOpen className="size-4" aria-hidden="true" />
            Buka antrean
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card id="rme-encounter-queue-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Antrean Pasien
          </CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Sembunyikan antrean pasien"
              title="Sembunyikan antrean pasien"
              aria-expanded={true}
              aria-controls="rme-encounter-queue-panel"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </Button>
          </CardAction>
          <p className="text-xs text-muted-foreground">{queueCountLabel}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {encountersLoading ? (
            <ScreenState kind="loading" title="Memuat antrean" compact />
          ) : loadError ? (
            <ScreenState
              kind="error"
              title="Antrean tidak tersedia"
              description={loadError}
              compact
              action={(
                <Button type="button" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Coba lagi
                </Button>
              )}
            />
          ) : encounters.length === 0 && !loadError ? (
            <ScreenState
              kind="empty"
              title="Belum ada antrean"
              description="Pasien yang siap diperiksa akan tampil di sini."
            />
          ) : encounters.map((encounter) => (
            <div
              key={encounter.id}
              className={`flex w-full items-center gap-2 rounded-[var(--radius-card)] border p-3 text-left transition-colors ${
                selectedEncounter?.id === encounter.id
                  ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectEncounter(encounter)}
                aria-pressed={selectedEncounter?.id === encounter.id}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-xs font-bold text-foreground">{encounter.patient?.fullName}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {encounter.patient?.medicalRecNo} · {formatEncounterQueueDate(encounter.queueDate)}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge className="bg-muted font-mono text-[10px] font-bold text-primary">#{encounter.queueNumber}</Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    title={getSatusehatEncounterStatusTooltip(encounter.status)}
                  >
                    {getSatusehatEncounterStatus(encounter.status)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{encounter.triage?.status === 'COMPLETED' ? 'Triase selesai' : encounter.triage?.status === 'DRAFT' ? 'Triase draft' : 'Triase belum selesai'}</Badge>
                </div>
              </button>
              {(encounter.status === EncounterStatus.ARRIVED || encounter.status === EncounterStatus.TRIAGED) && canStart ? (
                <Button type="button" size="sm" disabled={Boolean(startingEncounterId)} onClick={() => onStartEncounter(encounter)}>
                  {startingEncounterId === encounter.id ? 'Memulai...' : 'Mulai'}
                </Button>
              ) : null}
              {encounter.status === EncounterStatus.ONLEAVE && canPause ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={Boolean(transitioningEncounterId)}
                  onClick={() => onResumeEncounter(encounter)}
                  title="Lanjutkan pemeriksaan ke in-progress"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {transitioningEncounterId === encounter.id ? 'Melanjutkan...' : 'Lanjutkan'}
                </Button>
              ) : null}
            </div>
          ))}
          {totalPages > 1 ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-center text-[11px] text-muted-foreground">
                Halaman {meta.page} dari {totalPages} · {meta.total} antrean
              </p>
              <PaginationControl
                page={meta.page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                disabled={encountersLoading}
                showLabels={false}
                aria-label="Navigasi halaman antrean RME"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
