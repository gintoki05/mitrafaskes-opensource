'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { MaritalStatusSummary, Patient } from '@mitrafaskes/shared';
import { Edit3, Eye, Link2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { maritalStatusDisplay } from './marital-status-display';

const PATIENT_IHS_SYSTEM = 'https://fhir.kemkes.go.id/id/ihs-number';

type PatientDetailDialogProps = {
  open: boolean;
  patientId: string | null;
  canWrite: boolean;
  getPatient: (id: string) => Promise<Patient>;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
  onSync: (patient: Patient) => void;
  maritalStatuses: readonly MaritalStatusSummary[];
};

export function PatientDetailDialog({
  open,
  patientId,
  canWrite,
  getPatient,
  onClose,
  onEdit,
  onSync,
  maritalStatuses,
}: PatientDetailDialogProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !patientId) return;
    let cancelled = false;
    void getPatient(patientId)
      .then((result) => {
        if (!cancelled) setPatient(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setPatient(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Detail pasien tidak dapat dimuat.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getPatient, open, patientId]);

  if (!open || !patientId) return null;

  return (
    <MasterFaskesDialog
      open
      label={patient ? `Detail pasien ${patient.fullName}` : 'Detail pasien'}
      onClose={onClose}
      className="max-w-4xl"
    >
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
                Detail Patient lokal
              </CardTitle>
              {patient ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {patient.fullName} · {patient.medicalRecNo}
                </p>
              ) : null}
            </div>
            {patient ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    patient.active !== false
                      ? 'clinical-status-success border text-[10px] font-bold'
                      : 'clinical-status-error border text-[10px] font-bold'
                  }
                >
                  {patient.active !== false ? 'AKTIF' : 'NONAKTIF'}
                </Badge>
                <SatusehatLinkageBadge
                  linkage={patient.satusehat}
                  resourceName={patient.fullName}
                />
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {loading ? (
            <ScreenState
              kind="loading"
              title="Memuat detail pasien"
              description="Data terstruktur sedang diambil dari API lokal."
              compact
            />
          ) : error ? (
            <ScreenState kind="error" title="Detail belum tersedia" description={error} compact />
          ) : patient ? (
            <>
              {patient.satusehatSync?.status === 'FAILED' ? (
                <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Sinkronisasi terakhir gagal. Linkage sukses sebelumnya tetap dipertahankan; periksa pesan remote sebelum mencoba lagi.
                    {patient.satusehatSync.errorMessage ? ` ${patient.satusehatSync.errorMessage}` : ''}
                  </p>
                </div>
              ) : null}

              <section className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <DetailField label="Nama resmi" value={patient.fullName} />
                <DetailField label="NIK" value={patient.nik ?? 'Belum diisi'} mono />
                <DetailField
                  label="Nomor IHS / SATUSEHAT ID"
                  value={patient.satusehat?.externalResourceId ?? patient.satusehatId ?? 'Belum terhubung'}
                  mono
                />
                <DetailField label="Nomor rekam medis" value={patient.medicalRecNo} mono />
                <DetailField label="Tanggal lahir" value={patient.birthDate} />
                <DetailField label="Jenis kelamin" value={patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} />
                <DetailField label="Tempat lahir" value={patient.birthPlaceText ?? 'Belum diisi'} />
                <DetailField
                  label="Status perkawinan"
                  value={maritalStatusDisplay(patient.maritalStatusCode, maritalStatuses)}
                />
                <DetailField label="Telepon legacy" value={patient.phone ?? 'Belum diisi'} />
                <DetailField label="Alamat legacy" value={patient.address ?? 'Belum diisi'} wide />
                <DetailField label="Versi lokal" value={String(patient.version ?? 1)} mono />
              </section>

              <DetailListSection title="Identifier" icon={<Link2 className="h-4 w-4" aria-hidden="true" />}>
                {patient.identifiers?.length ? (
                  patient.identifiers.map((identifier) => (
                    <div key={identifier.id} className="grid gap-1 rounded-md border border-border bg-background p-3 text-xs sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center">
                      <span className="font-semibold text-foreground">
                        {identifier.system === PATIENT_IHS_SYSTEM
                          ? 'Nomor IHS (legacy)'
                          : identifier.type}
                      </span>
                      <span className="break-all font-mono text-muted-foreground">{identifier.value}</span>
                      <span className="text-muted-foreground">{identifier.active ? 'Aktif' : 'Historis'}</span>
                    </div>
                  ))
                ) : <EmptyChildText text="Belum ada identifier terstruktur." />}
              </DetailListSection>

              <DetailListSection title="Nama historis & preferred" icon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
                {patient.names?.length ? (
                  patient.names.map((name) => (
                    <div key={name.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-xs">
                      <span className="font-semibold text-foreground">{name.text}</span>
                      <span className="text-muted-foreground">{name.use}{name.validTo ? ' · historis' : ''}</span>
                    </div>
                  ))
                ) : <EmptyChildText text="Belum ada nama terstruktur." />}
              </DetailListSection>

              <DetailListSection title="Telecom" icon={<Link2 className="h-4 w-4" aria-hidden="true" />}>
                {patient.telecoms?.length ? (
                  patient.telecoms.map((telecom) => (
                    <div key={telecom.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-xs">
                      <span className="font-semibold text-foreground">{telecom.value}</span>
                      <span className="text-muted-foreground">{telecom.system} · {telecom.use} · {telecom.active ? 'Aktif' : 'Historis'}</span>
                    </div>
                  ))
                ) : <EmptyChildText text="Belum ada telepon/email terstruktur." />}
              </DetailListSection>

              <DetailListSection title="Alamat terstruktur" icon={<Link2 className="h-4 w-4" aria-hidden="true" />}>
                {patient.addresses?.length ? (
                  patient.addresses.map((address) => (
                    <div key={address.id} className="rounded-md border border-border bg-background p-3 text-xs">
                      <p className="font-semibold text-foreground">{address.text || address.lines.join(', ') || 'Alamat tanpa teks display'}</p>
                      <p className="mt-1 text-muted-foreground">
                        {[address.villageName, address.districtName, address.regencyName, address.provinceName, address.postalCode, address.countryCode].filter(Boolean).join(' · ') || 'Wilayah belum dilengkapi'}
                      </p>
                    </div>
                  ))
                ) : <EmptyChildText text="Belum ada alamat terstruktur." />}
              </DetailListSection>

              <DetailListSection title="Relasi / related person" icon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
                {patient.relationships?.length ? (
                  patient.relationships.map((relationship) => (
                    <div key={relationship.id} className="rounded-md border border-border bg-background p-3 text-xs">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-semibold text-foreground">{relationship.relationshipCode}</span>
                        <span className="text-muted-foreground">{relationship.active ? 'Aktif' : 'Historis'}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {relationship.relatedPerson?.fullName ?? relationship.relatedPatientId ?? 'Target relasi tidak tersedia'}
                      </p>
                    </div>
                  ))
                ) : <EmptyChildText text="Belum ada relasi pasien." />}
              </DetailListSection>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
                {canWrite ? (
                  <>
                    <SatusehatActionGroup
                      resourceName={patient.fullName}
                      onSync={() => onSync(patient)}
                      showLabels
                    />
                    <Button type="button" onClick={() => onEdit(patient)}>
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      Edit lokal
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}

function DetailField({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className={mono ? 'mt-1 break-all font-mono text-xs text-foreground' : 'mt-1 break-words text-sm text-foreground'}>{value}</dd>
    </div>
  );
}

function DetailListSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-primary">
        {icon}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyChildText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">{text}</p>;
}
