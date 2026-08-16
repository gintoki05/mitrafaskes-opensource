'use client';

import { EncounterStatus } from '@mitrafaskes/shared';
import type { EncounterStatusCounts } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type QueueStatusFilterValue = 'ACTIVE' | EncounterStatus;

export const queueStatusFilterValues: readonly QueueStatusFilterValue[] = [
  'ACTIVE',
  EncounterStatus.WAITING,
  EncounterStatus.IN_PROGRESS,
  EncounterStatus.COMPLETED,
  EncounterStatus.CANCELLED,
];

const queueStatusLabels: Record<QueueStatusFilterValue, string> = {
  ACTIVE: 'Aktif',
  [EncounterStatus.WAITING]: 'Menunggu',
  [EncounterStatus.IN_PROGRESS]: 'Diperiksa',
  [EncounterStatus.COMPLETED]: 'Selesai',
  [EncounterStatus.CANCELLED]: 'Dibatalkan',
};

const activeQueueStatuses: readonly EncounterStatus[] = [
  EncounterStatus.WAITING,
  EncounterStatus.IN_PROGRESS,
];

export function getQueueStatuses(
  filter: QueueStatusFilterValue,
): readonly EncounterStatus[] {
  return filter === 'ACTIVE' ? activeQueueStatuses : [filter];
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
            ? statusCounts.WAITING + statusCounts.IN_PROGRESS
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
