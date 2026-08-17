import { ActiveStatusBadge } from '@/components/ActiveStatusBadge';

export function PatientStatusBadge({
  active,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return <ActiveStatusBadge active={active} className={className} />;
}
