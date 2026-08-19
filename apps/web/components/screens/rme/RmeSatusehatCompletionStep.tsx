import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  LockKeyhole,
} from 'lucide-react';
import type {
  ResourceIntegrationLinkage,
  ResourceIntegrationSummary,
  ResourceIntegrationSync,
} from '@mitrafaskes/shared';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RmeSatusehatStepState } from './rme-satusehat-completion-model';

const stepStateLabel: Record<RmeSatusehatStepState, string> = {
  complete: 'Selesai',
  ready: 'Siap',
  blocked: 'Terblokir',
  empty: 'Belum ada data',
};

export function RmeSatusehatCompletionStep({
  icon,
  title,
  description,
  state,
  blocker,
  linkage,
  latestSync,
  resourceName,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  state: RmeSatusehatStepState;
  blocker?: string;
  linkage?: ResourceIntegrationLinkage;
  latestSync?: ResourceIntegrationSync;
  resourceName: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <StepStateIcon state={state}>{icon}</StepStateIcon>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  state === 'complete' && 'clinical-status-success',
                  state === 'ready' && 'border-primary/30 bg-primary/5 text-primary',
                  state === 'blocked' &&
                    'border-warning/30 bg-warning/10 text-warning-foreground',
                )}
              >
                {stepStateLabel[state]}
              </Badge>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
            {blocker && state !== 'complete' ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-warning-foreground">
                <LockKeyhole
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {blocker}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-10 lg:max-w-md lg:justify-end lg:pl-0">
          {linkage || latestSync ? (
            <SatusehatLinkageBadge
              linkage={linkage}
              latestSync={latestSync}
              resourceName={resourceName}
            />
          ) : null}
          {action}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}

export function RmeSatusehatResourceRow({
  title,
  detail,
  metadata,
  primary = false,
  integration,
  latestFailure,
  action,
}: {
  title: string;
  detail: string;
  metadata?: string;
  primary?: boolean;
  integration?: ResourceIntegrationSummary;
  latestFailure?: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary">{title}</span>
          <span className="text-xs text-foreground">{detail}</span>
          {primary ? (
            <Badge className="clinical-status-success border text-[10px]">UTAMA</Badge>
          ) : null}
        </div>
        {metadata ? (
          <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">
            {metadata}
          </p>
        ) : null}
        {latestFailure ? (
          <p className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-destructive">
            <AlertTriangle
              className="mt-0.5 h-3 w-3 shrink-0"
              aria-hidden="true"
            />
            {latestFailure}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <SatusehatLinkageBadge
          linkage={integration?.linkage}
          latestSync={integration?.latestSync}
          resourceName={title}
        />
        {action}
      </div>
    </div>
  );
}

function StepStateIcon({
  state,
  children,
}: {
  state: RmeSatusehatStepState;
  children: ReactNode;
}) {
  const Icon =
    state === 'complete'
      ? CheckCircle2
      : state === 'blocked'
        ? LockKeyhole
        : state === 'empty'
          ? CircleDashed
          : null;
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
        state === 'complete' && 'border-success/25 bg-success/10 text-success',
        state === 'ready' && 'border-primary/25 bg-primary/10 text-primary',
        state === 'blocked' &&
          'border-warning/25 bg-warning/10 text-warning-foreground',
        state === 'empty' && 'border-border bg-muted text-muted-foreground',
      )}
      aria-hidden="true"
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : children}
    </span>
  );
}
