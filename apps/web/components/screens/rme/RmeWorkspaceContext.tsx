import { ClipboardList, Clock3, MapPin, Stethoscope, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Encounter, MedicalRecord } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { buildRmeWorkspaceContext } from './rme-workspace-model';

export function RmeWorkspaceContext({
  encounter,
  record,
}: {
  encounter: Encounter;
  record: MedicalRecord | null;
}) {
  const context = buildRmeWorkspaceContext(encounter, record);

  return (
    <section aria-labelledby="rme-patient-context" className="data-surface">
      <div className="flex min-w-0 flex-col gap-4 border-b border-border bg-primary/[0.04] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="rme-patient-context" className="break-words text-base font-bold text-foreground">
              {context.patientName}
            </h2>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>No. RM {context.medicalRecordNumber}</span>
              <span>NIK {context.nik}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge className="border-primary/25 bg-primary/10 text-primary">
            {context.serviceProfileLabel}
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px]">
            {context.validationProfile}
          </Badge>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 p-4 xl:grid-cols-2">
        <ContextGroup icon={<UserRound className="h-4 w-4" />} title="Identitas pasien">
          <ContextField label="Lahir / usia" value={context.birthDateAndAge} />
          <ContextField label="Jenis kelamin" value={context.gender} />
          <ContextField label="Alamat" value={context.address} wide />
        </ContextGroup>
        <ContextGroup icon={<ClipboardList className="h-4 w-4" />} title="Kunjungan">
          <ContextField label="Encounter" value={context.encounterNumber} mono />
          <ContextField label="Nomor antrean" value={context.queueNumber} mono />
          <ContextField label="Lokasi" value={context.location} icon={<MapPin className="h-3.5 w-3.5" />} />
          <ContextField label="Dokter" value={context.doctor} icon={<Stethoscope className="h-3.5 w-3.5" />} />
          <ContextField label="Tiba" value={context.arrivalTime} icon={<Clock3 className="h-3.5 w-3.5" />} />
          <ContextField label="Waktu tunggu" value={context.waitDuration} />
        </ContextGroup>
      </div>
    </section>
  );
}

function ContextGroup({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <dl className="mt-3 grid min-w-0 gap-x-4 gap-y-3 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function ContextField({
  label,
  value,
  mono = false,
  wide = false,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
  icon?: ReactNode;
}) {
  const empty = value === 'Belum tersedia';
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] font-semibold text-muted-foreground">{label}</dt>
      <dd className={cn(
        'mt-0.5 flex min-w-0 items-start gap-1.5 break-words text-sm text-foreground',
        mono && 'font-mono text-xs',
        empty && 'italic text-muted-foreground',
      )}>
        {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true">{icon}</span> : null}
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}
