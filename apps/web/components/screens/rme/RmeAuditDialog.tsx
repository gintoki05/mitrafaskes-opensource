'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import type { RmeAuditItem } from '@mitrafaskes/shared';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { useRmeAudit } from './useRmeAudit';

const actionLabels: Record<string, string> = {
  RME_DRAFT_SAVED: 'Draft RME disimpan',
  RME_FINALIZED: 'RME difinalisasi',
  RME_TRIAGE_DRAFT_SAVED: 'Draft triase disimpan',
  RME_TRIAGE_COMPLETED: 'Triase diselesaikan',
  RME_TRIAGE_REOPENED: 'Triase dibuka kembali',
  RME_TRIAGE_CORRECTED_BY_DOCTOR: 'Triase dikoreksi dokter',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  DOKTER: 'Dokter',
  PERAWAT: 'Perawat',
  PETUGAS_PENDAFTARAN: 'Petugas pendaftaran',
};

export function RmeAuditDialog({
  encounterId,
  currentRevision,
}: {
  encounterId: string;
  currentRevision: number;
}) {
  const [open, setOpen] = useState(false);
  const audit = useRmeAudit(encounterId, open);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => setOpen(true)}
        aria-label={`Buka riwayat edit, ${currentRevision} revisi`}
        title="Lihat riwayat edit"
      >
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Riwayat edit ({currentRevision})
      </Button>

      {open ? (
        <MasterFaskesDialog
          open
          label="Riwayat edit RME"
          onClose={() => setOpen(false)}
          className="max-w-2xl"
        >
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <History className="h-4 w-4 text-primary" aria-hidden="true" />
                Riwayat edit RME
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Perubahan tersimpan untuk catatan ini.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {audit.loading ? (
                <ScreenState
                  kind="loading"
                  title="Memuat riwayat edit"
                  description="Mengambil perubahan yang tercatat."
                  compact
                />
              ) : audit.error ? (
                <ScreenState
                  kind="error"
                  title="Riwayat edit tidak tersedia"
                  description={audit.error}
                  compact
                  action={
                    <Button type="button" size="sm" onClick={audit.reload}>
                      Coba lagi
                    </Button>
                  }
                />
              ) : audit.items.length === 0 ? (
                <ScreenState
                  kind="empty"
                  title="Belum ada riwayat edit"
                  description="Perubahan yang tercatat akan tampil di sini."
                  compact
                />
              ) : (
                <ol className="divide-y divide-border rounded-[var(--radius-card)] border border-border">
                  {audit.items.map((item) => (
                    <AuditItem key={item.id} item={item} />
                  ))}
                </ol>
              )}
              <div className="flex justify-end border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Tutup
                </Button>
              </div>
            </CardContent>
          </Card>
        </MasterFaskesDialog>
      ) : null}
    </>
  );
}

function AuditItem({ item }: { item: RmeAuditItem }) {
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {actionLabels[item.action] ?? 'Perubahan RME'}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            Revisi {item.revision}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.actorUsername} · {roleLabels[item.actorRole] ?? item.actorRole}
        </p>
      </div>
      <time
        dateTime={item.occurredAt}
        className="shrink-0 text-xs text-muted-foreground sm:text-right"
      >
        {formatAuditDate(item.occurredAt)}
      </time>
    </li>
  );
}

function formatAuditDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
