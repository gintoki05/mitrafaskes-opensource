'use client';

import type { SatusehatLocationRemoteSummary } from '@mitrafaskes/shared';
import { CheckCircle2, Link2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LocationOperationalStatusBadge } from './LocationOperationalStatusBadge';

type SatusehatLocationResultProps = {
  item: SatusehatLocationRemoteSummary;
  selected: boolean;
  checked?: boolean;
  currentLocalResourceId?: string;
  onSelect: () => void;
  onCheckedChange?: (checked: boolean) => void;
};

export function SatusehatLocationResult({
  item,
  selected,
  checked,
  currentLocalResourceId,
  onSelect,
  onCheckedChange,
}: SatusehatLocationResultProps) {
  const linkedToCurrent = Boolean(
    currentLocalResourceId &&
      item.linkedLocalResourceId === currentLocalResourceId,
  );
  const linkedToAnother = Boolean(
    item.linkedLocalResourceId && !linkedToCurrent,
  );

  return (
    <Card
      className={
        selected
          ? 'border-primary/60 bg-primary/5'
          : 'border-border bg-background'
      }
    >
      <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3">
          {onCheckedChange ? (
            <Checkbox
              checked={Boolean(checked)}
              disabled={linkedToAnother || linkedToCurrent}
              onCheckedChange={onCheckedChange}
              aria-label={`Pilih ${item.name}`}
              className="mt-0.5"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-foreground">{item.name}</strong>
              <LocationOperationalStatusBadge status={item.status} className="text-[10px]" />
              <Badge variant="outline" className="text-[10px] uppercase">
                {item.mode}
              </Badge>
              {linkedToCurrent ? (
                <Badge className="clinical-status-success border text-[10px]">
                  Terhubung ke data ini
                </Badge>
              ) : linkedToAnother ? (
                <Badge variant="outline" className="text-[10px]">
                  Sudah terhubung
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[11px] text-primary">
              {item.identifierValue || 'Kode Location belum tersedia'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ID SATUSEHAT: {item.externalResourceId}
            </p>
            {linkedToCurrent ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Data ini sudah terhubung ke Location lokal ini
              </p>
            ) : linkedToAnother ? (
              <p className="mt-2 text-xs font-semibold text-destructive">
                Data ini sudah terhubung ke Location lokal lain
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            {linkedToCurrent || linkedToAnother ? (
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {item.physicalTypeDisplay || item.physicalTypeCode || 'Location'}
          </div>
          <Button
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            disabled={linkedToAnother || linkedToCurrent}
            onClick={onSelect}
            className="shrink-0"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {selected ? 'Dipilih' : 'Pilih data ini'}
          </Button>
        </div>
        <div className="col-span-full grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <span>
            Organisasi:{' '}
            {item.managingOrganizationDisplay ||
              item.managingOrganizationExternalResourceId ||
              '—'}
          </span>
          <span>
            Parent: {item.parentDisplay || item.parentExternalResourceId || 'Root'}
          </span>
          <span>
            Posisi:{' '}
            {item.latitude !== undefined && item.longitude !== undefined
              ? `${item.latitude}, ${item.longitude}`
              : 'Belum tersedia'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
