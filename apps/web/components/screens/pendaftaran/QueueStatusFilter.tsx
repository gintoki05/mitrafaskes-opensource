'use client';

import { EncounterStatus } from '@mitrafaskes/shared';
import type { EncounterStatusCounts } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACTIVE_ENCOUNTER_STATUSES } from '@/lib/encounter-statuses';
import {
  getLocalEncounterStatusLabel,
  getLocalEncounterStatusTooltip,
} from '@/lib/encounter-status-display';

export type QueueStatusFilterValue = 'ACTIVE' | EncounterStatus;

export const queueStatusFilterValues: readonly QueueStatusFilterValue[] = [
  'ACTIVE',
  EncounterStatus.PLANNED,
  EncounterStatus.ARRIVED,
  EncounterStatus.TRIAGED,
  EncounterStatus.IN_PROGRESS,
  EncounterStatus.ONLEAVE,
  EncounterStatus.FINISHED,
  EncounterStatus.CANCELLED,
  EncounterStatus.ENTERED_IN_ERROR,
  EncounterStatus.UNKNOWN,
];

const queueStatusLabels: Record<QueueStatusFilterValue, string> = {
  ACTIVE: 'Aktif',
  [EncounterStatus.PLANNED]: getLocalEncounterStatusLabel(EncounterStatus.PLANNED),
  [EncounterStatus.ARRIVED]: getLocalEncounterStatusLabel(EncounterStatus.ARRIVED),
  [EncounterStatus.TRIAGED]: getLocalEncounterStatusLabel(EncounterStatus.TRIAGED),
  [EncounterStatus.IN_PROGRESS]: getLocalEncounterStatusLabel(EncounterStatus.IN_PROGRESS),
  [EncounterStatus.ONLEAVE]: getLocalEncounterStatusLabel(EncounterStatus.ONLEAVE),
  [EncounterStatus.FINISHED]: getLocalEncounterStatusLabel(EncounterStatus.FINISHED),
  [EncounterStatus.CANCELLED]: getLocalEncounterStatusLabel(EncounterStatus.CANCELLED),
  [EncounterStatus.ENTERED_IN_ERROR]: getLocalEncounterStatusLabel(EncounterStatus.ENTERED_IN_ERROR),
  [EncounterStatus.UNKNOWN]: getLocalEncounterStatusLabel(EncounterStatus.UNKNOWN),
};

const queueStatusTooltips: Record<QueueStatusFilterValue, string> = {
  ACTIVE: 'Filter lokal untuk kunjungan yang belum selesai.',
  [EncounterStatus.PLANNED]: getLocalEncounterStatusTooltip(EncounterStatus.PLANNED),
  [EncounterStatus.ARRIVED]: getLocalEncounterStatusTooltip(EncounterStatus.ARRIVED),
  [EncounterStatus.TRIAGED]: getLocalEncounterStatusTooltip(EncounterStatus.TRIAGED),
  [EncounterStatus.IN_PROGRESS]: getLocalEncounterStatusTooltip(EncounterStatus.IN_PROGRESS),
  [EncounterStatus.ONLEAVE]: getLocalEncounterStatusTooltip(EncounterStatus.ONLEAVE),
  [EncounterStatus.FINISHED]: getLocalEncounterStatusTooltip(EncounterStatus.FINISHED),
  [EncounterStatus.CANCELLED]: getLocalEncounterStatusTooltip(EncounterStatus.CANCELLED),
  [EncounterStatus.ENTERED_IN_ERROR]: getLocalEncounterStatusTooltip(EncounterStatus.ENTERED_IN_ERROR),
  [EncounterStatus.UNKNOWN]: getLocalEncounterStatusTooltip(EncounterStatus.UNKNOWN),
};

export function getQueueStatuses(
  filter: QueueStatusFilterValue,
): readonly EncounterStatus[] {
  return filter === 'ACTIVE' ? ACTIVE_ENCOUNTER_STATUSES : [filter];
}

export function getQueueStatusLabel(filter: QueueStatusFilterValue): string {
  return queueStatusLabels[filter];
}

export function getQueueCountLabel(filter: QueueStatusFilterValue): string {
  if (filter === 'ACTIVE') return 'antrean aktif';
  return `antrean ${queueStatusLabels[filter].toLowerCase()}`;
}

type QueueStatusFilterProps = {
  value: QueueStatusFilterValue;
  statusCounts: EncounterStatusCounts;
  disabled?: boolean;
  onChange: (value: QueueStatusFilterValue) => void;
};

export function QueueStatusFilter({
  value,
  statusCounts,
  disabled = false,
  onChange,
}: QueueStatusFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter status antrean">
      <span className="mr-1 text-sm font-medium text-foreground">Status</span>
      {queueStatusFilterValues.map((filter) => {
        const selected = value === filter;
        const count =
          filter === 'ACTIVE'
            ? ACTIVE_ENCOUNTER_STATUSES.reduce(
                (total, status) => total + statusCounts[status],
                0,
              )
            : statusCounts[filter];

        return (
          <Button
            key={filter}
            type="button"
            variant="ghost"
            size="xs"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(filter)}
            title={queueStatusTooltips[filter]}
            className={cn(
              'h-9 gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-primary/25 bg-primary/10 text-primary'
                : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
            )}
          >
            <span>{queueStatusLabels[filter]}</span>
            <Badge
              variant={selected ? 'default' : 'outline'}
              className="h-5 min-w-5 px-1.5 text-xs"
            >
              {count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
