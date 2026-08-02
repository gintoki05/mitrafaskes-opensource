'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenState } from '@/components/ScreenState';
import type { Encounter } from '@/lib/clinical-types';

type RmeEncounterQueueProps = {
  encounters: Encounter[];
  selectedEncounter: Encounter | null;
  encountersLoading: boolean;
  loadError: string;
  onSelectEncounter: (encounter: Encounter) => void;
};

export function RmeEncounterQueue({
  encounters,
  selectedEncounter,
  encountersLoading,
  loadError,
  onSelectEncounter,
}: RmeEncounterQueueProps) {
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
        </CardContent>
      </Card>
    </div>
  );
}

