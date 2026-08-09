import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import type { MasterDataDatasetStatus } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MasterDataStatusBadge } from './MasterDataStatusBadge';

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Belum pernah sukses';

export function MasterDataDatasetCard({
  dataset,
  canRefresh,
  refreshing,
  onRefresh,
}: {
  dataset: MasterDataDatasetStatus;
  canRefresh: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const isWilayah = dataset.domain === 'WILAYAH';
  const isMaritalStatus = dataset.domain === 'MARITAL_STATUS';

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="flex items-center gap-2">
          {dataset.label}
          <MasterDataStatusBadge readiness={dataset.readiness} />
        </CardTitle>
        <CardDescription>
          {dataset.activeRecordCount > 0
            ? `${dataset.activeRecordCount.toLocaleString('id-ID')} record aktif di lokal.`
            : 'Belum ada snapshot lokal untuk dataset ini.'}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{dataset.domain}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4 pt-4">
        <dl className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Sumber terakhir</dt>
            <dd className="font-semibold text-foreground">
              {dataset.source || 'Belum ada'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Versi snapshot</dt>
            <dd className="max-w-[12rem] truncate font-semibold text-foreground">
              {dataset.sourceVersion || '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Refresh sukses</dt>
            <dd className="text-right font-semibold text-foreground">
              {formatDate(dataset.lastSuccessfulAt)}
            </dd>
          </div>
        </dl>

        {dataset.lastError ? (
          <p className="rounded-[var(--radius-control)] border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
            {dataset.lastError.message}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2">
          {isWilayah ? (
            <Link
              href="/master-data/wilayah"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Buka browser <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : isMaritalStatus ? (
            <span className="text-xs text-success">Lookup Patient lokal</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Fase berikutnya
            </span>
          )}
          {isWilayah && canRefresh && onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <RefreshCw
                className={refreshing ? 'motion-safe:animate-spin' : undefined}
                aria-hidden="true"
              />
              Refresh manual
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
