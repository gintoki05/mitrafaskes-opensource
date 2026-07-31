import { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  LoaderCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ScreenStateKind = 'loading' | 'empty' | 'error' | 'success';

const statePresentation: Record<
  ScreenStateKind,
  {
    icon: typeof LoaderCircle;
    className: string;
    iconClassName: string;
    role: 'alert' | 'status';
  }
> = {
  loading: {
    icon: LoaderCircle,
    className: 'border-info/25 bg-info/10 text-foreground',
    iconClassName: 'text-info motion-safe:animate-spin',
    role: 'status',
  },
  empty: {
    icon: CircleOff,
    className: 'border-border bg-muted/60 text-foreground',
    iconClassName: 'text-muted-foreground',
    role: 'status',
  },
  error: {
    icon: AlertTriangle,
    className: 'clinical-status-error',
    iconClassName: 'text-destructive',
    role: 'alert',
  },
  success: {
    icon: CheckCircle2,
    className: 'clinical-status-success',
    iconClassName: 'text-success',
    role: 'status',
  },
};

export function ScreenState({
  kind,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  kind: ScreenStateKind;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const presentation = statePresentation[kind];
  const Icon = presentation.icon;

  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border',
        compact
          ? 'flex flex-col items-start gap-3 p-3 sm:flex-row sm:items-center'
          : 'flex min-h-44 flex-col items-center justify-center gap-3 p-6 text-center',
        presentation.className,
        className,
      )}
      role={presentation.role}
      aria-live={kind === 'loading' || kind === 'success' ? 'polite' : undefined}
      aria-busy={kind === 'loading' ? true : undefined}
    >
      <Icon
        className={cn(
          compact ? 'mt-0.5 h-5 w-5 shrink-0 sm:mt-0' : 'h-8 w-8',
          presentation.iconClassName,
        )}
        aria-hidden="true"
      />
      <div className={cn('min-w-0', compact && 'flex-1')}>
        <h2 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{title}</h2>
        {description ? (
          <p className={cn('mt-1 leading-relaxed text-muted-foreground', compact ? 'text-xs' : 'max-w-xl text-sm')}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className={cn('flex flex-wrap gap-2', compact ? 'w-full sm:w-auto sm:shrink-0' : 'mt-1 justify-center')}>
          {action}
        </div>
      ) : null}
    </section>
  );
}
