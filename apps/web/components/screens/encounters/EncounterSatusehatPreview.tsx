import type {
  Encounter,
  SatusehatEncounterOperation,
} from '@mitrafaskes/shared';
import { Building2, CalendarClock, MapPin, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  getSatusehatEncounterStatus,
  getSatusehatEncounterStatusTooltip,
} from '@/components/satusehat/satusehat-status';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

type PreviewFieldProps = {
  label: string;
  value: string | number;
  mono?: boolean;
  tooltip?: string;
};

function PreviewField({ label, value, mono = false, tooltip }: PreviewFieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? 'mt-1 break-words font-mono text-xs text-foreground'
            : 'mt-1 break-words text-sm text-foreground'
        }
      >
        <span title={tooltip}>{value}</span>
      </dd>
    </div>
  );
}

type EncounterSatusehatPreviewProps = {
  encounter: Encounter;
  operation: SatusehatEncounterOperation;
  externalResourceId?: string;
};

export function EncounterSatusehatPreview({
  encounter,
  operation,
  externalResourceId,
}: EncounterSatusehatPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-card)] bg-primary/[0.05] p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Data kunjungan yang akan dikirim
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Periksa pasien, dokter, lokasi layanan, dan waktu kunjungan.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Kunjungan
        </Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-background">
        <section className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            <h3>Identitas kunjungan</h3>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <PreviewField label="Nomor kunjungan" value={encounter.encounterNumber} mono />
            <PreviewField label="Nomor antrean" value={encounter.queueNumber} />
            <PreviewField label="Tanggal antrean" value={formatDate(encounter.queueDate)} />
            <PreviewField label="Waktu datang" value={formatDateTime(encounter.arrivedAt)} />
            <PreviewField
              label="Status kunjungan SATUSEHAT"
              value={getSatusehatEncounterStatus(encounter.status)}
              tooltip={getSatusehatEncounterStatusTooltip(encounter.status)}
            />
            <PreviewField
              label="ID kunjungan SATUSEHAT"
              value={
                externalResourceId ??
                (operation === 'CREATE'
                  ? 'Akan dibuat setelah sinkronisasi pertama'
                  : 'Tidak tersedia')
              }
              mono={Boolean(externalResourceId)}
            />
          </dl>
        </section>

        <section className="border-t border-border p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            <h3>Pasien dan dokter</h3>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <PreviewField
              label="Nama pasien"
              value={encounter.patient?.fullName ?? 'Nama pasien tidak tersedia'}
            />
            <PreviewField
              label="Nomor rekam medis"
              value={encounter.patient?.medicalRecNo ?? 'Nomor rekam medis tidak tersedia'}
              mono={Boolean(encounter.patient?.medicalRecNo)}
            />
            <PreviewField
              label="Dokter"
              value={encounter.doctor?.fullName ?? 'Dokter tidak tersedia'}
            />
          </dl>
        </section>

        <section className="border-t border-border p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <h3>Lokasi layanan</h3>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <PreviewField
              label="Poli atau lokasi"
              value={encounter.location?.name ?? 'Lokasi layanan tidak tersedia'}
            />
            <div className="flex gap-2 sm:col-span-1">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <PreviewField
                label="Fasilitas kesehatan"
                value={encounter.organization?.name ?? 'Fasilitas kesehatan tidak tersedia'}
              />
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
