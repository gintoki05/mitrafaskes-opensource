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
            <button
              key={encounter.id}
              onClick={() => onSelectEncounter(encounter)}
              aria-pressed={selectedEncounter?.id === encounter.id}
              className={`flex w-full items-center justify-between rounded-[var(--radius-card)] border p-3 text-left transition-colors ${
                selectedEncounter?.id === encounter.id
                  ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-foreground">{encounter.patient?.fullName}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{encounter.patient?.medicalRecNo}</div>
              </div>
              <Badge className="bg-muted font-mono text-xs font-bold text-primary">
                #{encounter.queueNumber}
              </Badge>
            </button>
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
