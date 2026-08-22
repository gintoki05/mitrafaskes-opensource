'use client';

import type { Encounter } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import {
  getLocalEncounterStatusClass,
  getLocalEncounterStatusLabel,
  getLocalEncounterStatusTooltip,
} from '@/lib/encounter-status-display';

type PatientEncounterStatusBadgeProps = {
  encounter?: Encounter;
  loading?: boolean;
  unavailable?: boolean;
  unavailableMessage?: string;
};

export function PatientEncounterStatusBadge({
  encounter,
  loading = false,
  unavailable = false,
  unavailableMessage,
}: PatientEncounterStatusBadgeProps) {
  if (loading) {
    return (
      <Badge variant="outline" className="border-border text-xs font-semibold text-muted-foreground">
        Memuat status
      </Badge>
    );
  }

  if (unavailable) {
    return (
      <Badge
        variant="outline"
        className="border-border text-xs font-semibold text-muted-foreground"
        title={unavailableMessage ?? 'Status kunjungan hari ini belum tersedia.'}
      >
        Status belum tersedia
      </Badge>
    );
  }

  if (!encounter) {
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/40 text-xs font-semibold text-muted-foreground"
        title="Belum ada kunjungan lokal hari ini."
      >
        Belum didaftarkan
      </Badge>
    );
  }

  return (
    <div className="flex min-w-[8.5rem] flex-col items-start gap-1">
      <Badge
        className={getLocalEncounterStatusClass(encounter.status)}
        title={getLocalEncounterStatusTooltip(encounter.status)}
      >
        {getLocalEncounterStatusLabel(encounter.status)}
      </Badge>
      <span className="text-[11px] text-muted-foreground">
        Antrean <strong className="font-mono text-foreground">#{encounter.queueNumber}</strong>
      </span>
    </div>
  );
}
