'use client';

import type { SatusehatPractitionerRemoteSummary } from '@mitrafaskes/shared';
import { CheckCircle2, Link2, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type SatusehatPractitionerResultProps = {
  item: SatusehatPractitionerRemoteSummary;
  selected: boolean;
  currentLocalResourceId: string;
  onSelect: () => void;
};

export function SatusehatPractitionerResult({
  item,
  selected,
  currentLocalResourceId,
  onSelect,
}: SatusehatPractitionerResultProps) {
  const linkedToCurrent = item.linkedLocalResourceId === currentLocalResourceId;
  const linkedToAnother = Boolean(
    item.linkedLocalResourceId && !linkedToCurrent,
  );

  return (
    <Card className={selected ? 'border-primary/60 bg-primary/5' : 'border-border bg-background'}>
      <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-foreground">{item.name}</strong>
              <Badge className="border-primary/25 bg-primary/10 text-[10px] text-primary">
                {item.active ? 'AKTIF' : 'NONAKTIF'}
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
              ID SATUSEHAT: {item.externalResourceId}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.gender ? `Gender: ${item.gender}` : 'Gender belum tersedia'}
              {item.birthDate ? ` · Lahir: ${item.birthDate}` : ''}
            </p>
            {item.identifiers.length > 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Identifier: {item.identifiers.map((identifier) => identifier.value).join(', ')}
              </p>
            ) : null}
            {linkedToCurrent ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Data ini sudah terhubung ke Practitioner lokal ini
              </p>
            ) : linkedToAnother ? (
              <p className="mt-2 text-xs font-semibold text-destructive">
                Data ini sudah terhubung ke Practitioner lokal lain
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            {linkedToCurrent || linkedToAnother ? (
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Practitioner SATUSEHAT
          </div>
          <Button
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            disabled={linkedToAnother}
            onClick={onSelect}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {selected
              ? 'Dipilih'
              : linkedToCurrent
                ? 'Sinkronkan ulang'
                : 'Pilih data ini'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
