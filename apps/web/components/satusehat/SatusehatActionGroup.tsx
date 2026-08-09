'use client';

import { Link2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SatusehatActionGroupProps = {
  resourceName: string;
  onSync?: () => void;
  onLink?: () => void;
  syncDisabled?: boolean;
  syncDisabledReason?: string;
  linkDisabled?: boolean;
  linkDisabledReason?: string;
  showLabels?: boolean;
  className?: string;
};

export function SatusehatActionGroup({
  resourceName,
  onSync,
  onLink,
  syncDisabled = false,
  syncDisabledReason,
  linkDisabled = false,
  linkDisabledReason,
  showLabels = false,
  className,
}: SatusehatActionGroupProps) {
  if (!onSync && !onLink) return null;

  const size = showLabels ? 'sm' : 'icon-xs';

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-1', className)}>
      {onSync ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={onSync}
          disabled={syncDisabled}
          aria-label={`Sinkronkan SATUSEHAT untuk ${resourceName}`}
          title={syncDisabled ? syncDisabledReason ?? 'Sinkronisasi belum tersedia' : 'Sinkronkan SATUSEHAT'}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {showLabels ? 'Sinkronkan SATUSEHAT' : null}
        </Button>
      ) : null}
      {onLink ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={onLink}
          disabled={linkDisabled}
          aria-label={`Hubungkan SATUSEHAT untuk ${resourceName}`}
          title={linkDisabled ? linkDisabledReason ?? 'Hubungkan SATUSEHAT belum tersedia' : 'Hubungkan SATUSEHAT'}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          {showLabels ? 'Hubungkan SATUSEHAT' : null}
        </Button>
      ) : null}
    </div>
  );
}
