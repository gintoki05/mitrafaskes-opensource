import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PatientStatusBadge({
  active,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  const isActive = active !== false;

  return (
    <Badge
      className={cn(
        isActive
          ? 'clinical-status-success border text-[11px] font-bold'
          : 'clinical-status-error border text-[11px] font-bold',
        className,
      )}
    >
      {isActive ? 'AKTIF' : 'NONAKTIF'}
    </Badge>
  );
}
