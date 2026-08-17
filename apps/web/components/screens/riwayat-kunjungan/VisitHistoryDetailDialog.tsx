'use client';

import type { Encounter } from '@mitrafaskes/shared';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import {
  encounterStatusLabels,
  formatVisitDate,
  formatVisitDateTime,
  statusClass,
} from './constants';

type VisitHistoryDetailDialogProps = {
  encounter: Encounter | null;
  onClose: () => void;
};

export function VisitHistoryDetailDialog({
  encounter,
  onClose,
}: VisitHistoryDetailDialogProps) {
  if (!encounter) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Detail kunjungan ${encounter.encounterNumber}`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            Detail riwayat kunjungan
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {encounter.encounterNumber} · {formatVisitDate(encounter.queueDate)}
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Status kunjungan</p>
              <p className="mt-1 text-xs text-muted-foreground">Data ini bersifat read-only dari histori Encounter.</p>
            </div>
            <Badge className={statusClass(encounter.status)}>{encounterStatusLabels[encounter.status]}</Badge>
          </div>

          <section aria-labelledby="visit-detail-identity">
            <h3 id="visit-detail-identity" className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Identitas kunjungan</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <DetailItem label="No. kunjungan" value={encounter.encounterNumber} mono />
              <DetailItem label="No. antrean" value={`#${encounter.queueNumber}`} mono />
              <DetailItem label="Tanggal kunjungan" value={formatVisitDate(encounter.queueDate)} />
            </div>
          </section>

          <section aria-labelledby="visit-detail-patient">
            <h3 id="visit-detail-patient" className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Pasien dan layanan</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Pasien" value={encounter.patient?.fullName ?? 'Belum tersedia'} />
              <DetailItem label="No. RM" value={encounter.patient?.medicalRecNo ?? 'Belum tersedia'} mono />
              <DetailItem label="Dokter" value={encounter.doctor?.fullName ?? 'Belum tersedia'} />
              <DetailItem label="Location" value={encounter.location?.name ?? 'Belum tersedia'} />
              <DetailItem label="Organisasi" value={encounter.organization?.name ?? 'Belum tersedia'} />
              <div className="rounded-[var(--radius-control)] border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">SATUSEHAT</p>
                <div className="mt-1">
                  <SatusehatLinkageBadge
                    linkage={getIntegrationLinkage(encounter.integrations, 'SATUSEHAT')}
                    latestSync={getLatestIntegrationSync(encounter.integrations, 'SATUSEHAT')}
                    resourceName={encounter.encounterNumber}
                  />
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="visit-detail-lifecycle">
            <h3 id="visit-detail-lifecycle" className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Waktu lifecycle</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Datang" value={formatVisitDateTime(encounter.arrivedAt)} />
              <DetailItem label="Mulai diperiksa" value={formatVisitDateTime(encounter.startedAt)} />
              <DetailItem label="Selesai" value={formatVisitDateTime(encounter.completedAt)} />
              <DetailItem label="Dibatalkan" value={formatVisitDateTime(encounter.cancelledAt)} />
            </div>
          </section>

          <section aria-labelledby="visit-detail-history">
            <h3 id="visit-detail-history" className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Riwayat status</h3>
            <div className="mt-3 divide-y divide-border rounded-[var(--radius-card)] border border-border">
              {encounter.statusHistory.length > 0 ? encounter.statusHistory.map((history) => (
                <div key={history.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Badge variant="outline" className="text-[11px]">{encounterStatusLabels[history.status]}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{history.actorUsername} · {history.actorRole}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatVisitDateTime(history.periodStart)}{history.periodEnd ? ` – ${formatVisitDateTime(history.periodEnd)}` : ' – aktif'}
                  </p>
                </div>
              )) : (
                <p className="p-3 text-xs text-muted-foreground">Riwayat status belum tersedia.</p>
              )}
            </div>
          </section>

          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Tutup
            </Button>
          </div>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-control)] border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
