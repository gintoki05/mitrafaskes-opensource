import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ActiveStatusBadgeProps = {
  active?: boolean;
  className?: string;
};

export function ActiveStatusBadge({
  active,
  className,
}: ActiveStatusBadgeProps) {
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
