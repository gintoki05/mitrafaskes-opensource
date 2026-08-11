'use client';

import {
  CircleCheck,
  CircleOff,
  CircleX,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  useSatusehatConnection,
  type SatusehatConnectionDisplayStatus,
} from '@/hooks/useSatusehatConnection';

const statusPresentation: Record<
  SatusehatConnectionDisplayStatus,
  { label: string; icon: LucideIcon; iconClassName: string }
> = {
  LOADING: {
    label: 'Memeriksa SATUSEHAT',
    icon: LoaderCircle,
    iconClassName: 'text-white/70 motion-safe:animate-spin',
  },
  CONNECTED: {
    label: 'Terhubung SATUSEHAT',
    icon: CircleCheck,
    iconClassName: 'text-accent',
  },
  NOT_CONFIGURED: {
    label: 'SATUSEHAT belum dikonfigurasi',
    icon: CircleOff,
    iconClassName: 'text-warning',
  },
  ERROR: {
    label: 'SATUSEHAT tidak terhubung',
    icon: CircleX,
    iconClassName: 'text-destructive',
  },
  DISABLED: {
    label: 'SATUSEHAT nonaktif',
    icon: CircleOff,
    iconClassName: 'text-white/60',
  },
};

export function SatusehatConnectionBadge() {
  const status = useSatusehatConnection();
  const presentation = statusPresentation[status];
  const Icon = presentation.icon;

  return (
    <span
      className="hidden items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white sm:flex"
      role="status"
      aria-live="polite"
      aria-label={presentation.label}
      title={presentation.label}
    >
      <Icon className={`h-3.5 w-3.5 ${presentation.iconClassName}`} aria-hidden="true" />
      {presentation.label}
    </span>
  );
}
