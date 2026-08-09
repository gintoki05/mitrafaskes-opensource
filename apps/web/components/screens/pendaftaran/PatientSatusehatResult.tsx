'use client';

import type { SatusehatPatientRemoteSummary } from '@mitrafaskes/shared';
import { CheckCircle2, Link2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type PatientSatusehatResultProps = {
  item: SatusehatPatientRemoteSummary;
  selected: boolean;
  currentLocalResourceId: string;
  onSelect: () => void;
};

export function PatientSatusehatResult({
  item,
  selected,
  currentLocalResourceId,
  onSelect,
}: PatientSatusehatResultProps) {
  const linkedToCurrent = item.linkedLocalResourceId === currentLocalResourceId;
  const linkedToAnother = Boolean(
    item.linkedLocalResourceId && !linkedToCurrent,
  );
  const nik = item.identifiers.find(
    (identifier) => identifier.system === 'https://fhir.kemkes.go.id/id/nik',
  )?.value;

  return (
    <Card className={selected ? 'border-primary/60 bg-primary/5' : 'border-border bg-background'}>
      <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-foreground">{item.name}</strong>
              <Badge className={item.active ? 'clinical-status-success border text-[10px]' : 'clinical-status-error border text-[10px]'}>
                {item.active ? 'AKTIF' : 'NONAKTIF'}
              </Badge>
              {linkedToCurrent ? (
                <Badge className="clinical-status-success border text-[10px]">Terhubung ke data ini</Badge>
              ) : linkedToAnother ? (
                <Badge variant="outline" className="text-[10px]">Sudah terhubung</Badge>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[11px] text-primary">
              ID SATUSEHAT: {item.externalResourceId}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.gender ? `Gender: ${item.gender}` : 'Gender belum tersedia'}
              {item.birthDate ? ` · Lahir: ${item.birthDate}` : ''}
            </p>
            {nik ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">NIK: {nik}</p>
            ) : null}
            {linkedToCurrent ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Data ini sudah terhubung ke pasien lokal ini
              </p>
            ) : linkedToAnother ? (
              <p className="mt-2 text-xs font-semibold text-destructive">
                Data ini sudah terhubung ke pasien lokal lain
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            {linkedToCurrent || linkedToAnother ? (
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Patient SATUSEHAT
          </div>
          <Button
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            disabled={linkedToAnother}
            onClick={onSelect}
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {selected ? 'Dipilih' : linkedToCurrent ? 'Gunakan lagi' : 'Hubungkan data ini'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
