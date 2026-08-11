import type { LocationStatus } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { locationStatuses } from './constants';

type LocationOperationalStatus =
  | LocationStatus
  | Lowercase<LocationStatus>;

const statusPresentation: Record<
  LocationStatus,
  { className: string }
> = {
  ACTIVE: {
    className: 'clinical-status-success',
  },
  SUSPENDED: {
    className: 'clinical-status-warning',
  },
  INACTIVE: {
    className: 'clinical-status-error',
  },
};

export function LocationOperationalStatusBadge({
  status,
  className,
}: {
  status: LocationOperationalStatus;
  className?: string;
}) {
  const normalizedStatus = status.toUpperCase() as LocationStatus;
  const presentation = statusPresentation[normalizedStatus];
  const label =
    locationStatuses
      .find((option) => option.value === normalizedStatus)
      ?.label.toUpperCase() ?? normalizedStatus;

  return (
    <Badge
      className={cn(
        presentation.className,
        'border text-[11px] font-bold',
        className,
      )}
    >
      {label}
    </Badge>
  );
}
