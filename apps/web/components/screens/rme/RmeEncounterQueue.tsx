'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationControl } from '@/components/ui/pagination';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { ListMeta } from '@mitrafaskes/shared';
import type { Encounter } from '@/lib/clinical-types';

type RmeEncounterQueueProps = {
  encounters: Encounter[];
  meta: ListMeta;
  selectedEncounter: Encounter | null;
  encountersLoading: boolean;
  loadError: string;
  onSelectEncounter: (encounter: Encounter) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  canStart: boolean;
  startingEncounterId: string | null;
  onStartEncounter: (encounter: Encounter) => void;
};

export function RmeEncounterQueue({
  encounters,
  meta,
  selectedEncounter,
  encountersLoading,
  loadError,
  onSelectEncounter,
  onPageChange,
  onRetry,
  canStart,
  startingEncounterId,
  onStartEncounter,
}: RmeEncounterQueueProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Antrean Pasien
          </CardTitle>
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
                <div className="font-mono text-[11px] text-muted-foreground">{encounter.patient?.medicalRecNo}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge className="bg-muted font-mono text-[10px] font-bold text-primary">#{encounter.queueNumber}</Badge>
                  <Badge variant="outline" className="text-[10px]">{encounter.status === 'WAITING' ? 'Menunggu' : 'Sedang diperiksa'}</Badge>
                  <Badge variant="outline" className="text-[10px]">{encounter.triage?.status === 'COMPLETED' ? 'Triase selesai' : encounter.triage?.status === 'DRAFT' ? 'Triase draft' : 'Triase belum selesai'}</Badge>
                </div>
              </button>
              {encounter.status === 'WAITING' && canStart ? (
                <Button type="button" size="sm" disabled={Boolean(startingEncounterId)} onClick={() => onStartEncounter(encounter)}>
                  {startingEncounterId === encounter.id ? 'Memulai...' : 'Mulai'}
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
