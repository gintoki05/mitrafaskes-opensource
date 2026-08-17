'use client';

import type { MasterDataStatusCounts } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type MasterFaskesStatusFilterValue = boolean | undefined;

type MasterFaskesStatusFilterProps = {
  counts?: MasterDataStatusCounts;
  value: MasterFaskesStatusFilterValue;
  onChange: (value: MasterFaskesStatusFilterValue) => void;
  disabled?: boolean;
  ariaLabel: string;
};

export function MasterFaskesStatusFilter({
  counts,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: MasterFaskesStatusFilterProps) {
  const activeCount = counts?.active ?? 0;
  const inactiveCount = counts?.inactive ?? 0;
  const statusFilterOptions = [
    { value: true, label: 'Aktif', count: activeCount },
    { value: false, label: 'Nonaktif', count: inactiveCount },
    { value: undefined, label: 'Semua', count: activeCount + inactiveCount },
  ] as const;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={ariaLabel}
    >
      <span className="mr-1 text-xs font-semibold text-foreground">Status</span>
      {statusFilterOptions.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground',
            )}
          >
            <span>{option.label}</span>
            <Badge
              variant={selected ? 'default' : 'outline'}
              className="h-5 min-w-5 px-1.5 text-[11px]"
            >
              {option.count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
