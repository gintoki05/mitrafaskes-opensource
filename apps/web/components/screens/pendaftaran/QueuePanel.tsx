'use client';

import { Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScreenState } from '@/components/ScreenState';
import type { Encounter } from '@/lib/clinical-types';

type QueuePanelProps = {
  encounters: Encounter[];
  encountersLoading: boolean;
  encountersError: string;
};

export function QueuePanel({ encounters, encountersLoading, encountersError }: QueuePanelProps) {
  return (
    <section id="antrean-aktif" className="data-surface scroll-mt-24" aria-labelledby="queue-title">
      <div className="data-toolbar">
        <div>
          <h2 id="queue-title" className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Antrean rawat jalan hari ini
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Kunjungan pasien yang sedang diproses hari ini; data identitas tetap berada di Data Pasien.</p>
        </div>
        <Badge variant="outline" className="border-primary/25 bg-primary/5 font-mono text-primary">
          {encounters.length} antrean
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {encountersLoading ? (
          <div className="p-4"><ScreenState kind="loading" title="Memuat antrean" description="Mohon tunggu sebentar." compact /></div>
        ) : encounters.length === 0 && !encountersError ? (
          <div className="p-4">
            <ScreenState kind="empty" title="Antrean masih kosong" description="Pasien yang didaftarkan ke poli akan muncul di sini." />
          </div>
        ) : encounters.map((encounter) => (
          <div key={encounter.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-primary/[0.035] sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-sm font-bold text-primary-foreground">{encounter.queueNumber}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{encounter.patient?.fullName ?? 'Pasien tanpa nama'}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{encounter.patient?.medicalRecNo ?? 'Nomor RM belum tersedia'}</div>
              </div>
            </div>
            <Badge className={encounter.status === 'WAITING' ? 'clinical-status-warning border text-[11px] font-bold' : encounter.status === 'IN_PROGRESS' ? 'border-primary/20 bg-primary/10 text-[11px] font-bold text-primary' : 'clinical-status-success border text-[11px] font-bold'}>
              {encounter.status === 'WAITING' ? 'MENUNGGU' : encounter.status === 'IN_PROGRESS' ? 'DIPERIKSA' : 'SELESAI'}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}
