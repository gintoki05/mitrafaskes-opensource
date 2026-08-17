'use client';

import type { ReactNode } from 'react';
import type { MaritalStatusSummary, Patient } from '@mitrafaskes/shared';
import {
  ChevronDown,
  Edit3,
  Link2,
  ListPlus,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { cn } from '@/lib/utils';
import { getIntegrationLinkage } from '@/lib/integrations';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { maritalStatusDisplay } from './marital-status-display';
import { PatientSyncReadinessNotice } from './PatientSyncReadinessNotice';
import { getPatientSyncReadiness } from './patient-sync-readiness';

const PATIENT_IHS_SYSTEM = 'https://fhir.kemkes.go.id/id/ihs-number';

const IDENTIFIER_TYPE_LABELS: Record<string, string> = {
  NIK: 'NIK',
  MOTHER_NIK: 'NIK ibu',
  PASSPORT: 'Paspor',
  FAMILY_CARD: 'Kartu keluarga',
  OTHER: 'Lainnya',
};

const NAME_USE_LABELS: Record<string, string> = {
  OFFICIAL: 'Nama resmi',
  PREFERRED: 'Nama pilihan',
  ALIAS: 'Alias',
  OLD: 'Nama historis',
};

const TELECOM_SYSTEM_LABELS: Record<string, string> = {
  PHONE: 'Telepon',
  EMAIL: 'Email',
  FAX: 'Faksimile',
  OTHER: 'Kontak lain',
};

const TELECOM_USE_LABELS: Record<string, string> = {
  MOBILE: 'Seluler',
  HOME: 'Rumah',
  WORK: 'Tempat kerja',
  TEMP: 'Sementara',
  OTHER: 'Lainnya',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  MOTHER: 'Ibu',
  FATHER: 'Ayah',
  CHILD: 'Anak',
  GUARDIAN: 'Wali',
  CAREGIVER: 'Pendamping',
  OTHER: 'Lainnya',
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  UNVERIFIED: 'Belum diverifikasi',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Ditolak',
  EXPIRED: 'Kedaluwarsa',
};

type PatientDetailContentProps = {
  patient: Patient;
  canWrite: boolean;
  canCreateQueue: boolean;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
  onQueue: (patient: Patient) => void;
  onSync: (patient: Patient) => void;
  maritalStatuses: readonly MaritalStatusSummary[];
};

export function PatientDetailContent({
  patient,
  canWrite,
  canCreateQueue,
  onClose,
  onEdit,
  onQueue,
  onSync,
  maritalStatuses,
}: PatientDetailContentProps) {
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const linkage = getIntegrationLinkage(patient.integrations, 'SATUSEHAT');
  const identifiers = patient.identifiers ?? [];
  const names = patient.names ?? [];
  const telecoms = patient.telecoms ?? [];
  const addresses = patient.addresses ?? [];
  const relationships = patient.relationships ?? [];
  const syncReadiness = getPatientSyncReadiness(patient);

  return (
    <>
      <section
        aria-labelledby="patient-verification-heading"
        className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/[0.04] p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="patient-verification-heading" className="text-sm font-bold text-foreground">
              Verifikasi identitas
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Cek data utama sebelum masuk antrean.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Nama lengkap" value={patient.fullName} />
          <DetailField label="NIK" value={patient.nik ?? 'Belum diisi'} mono empty={!patient.nik} />
          <DetailField label="Nomor rekam medis" value={patient.medicalRecNo} mono />
          <DetailField label="Tanggal lahir" value={patient.birthDate} />
          <DetailField
            label="Jenis kelamin"
            value={patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
          />
          <DetailField
            label="Alamat"
            value={patient.address ?? 'Belum diisi'}
            empty={!patient.address}
            className="sm:col-span-2 lg:col-span-3"
          />
        </dl>
      </section>

      <div className="grid gap-3">
        <PatientDetailDisclosure
          title="Kontak & informasi tambahan"
          meta={patient.phone || patient.birthPlaceText || patient.maritalStatusCode ? 'Data tersedia' : 'Belum ada data'}
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
        >
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DetailField label="Telepon" value={patient.phone ?? 'Belum diisi'} empty={!patient.phone} />
            <DetailField
              label="Tempat lahir"
              value={patient.birthPlaceText ?? 'Belum diisi'}
              empty={!patient.birthPlaceText}
            />
            <DetailField
              label="Status perkawinan"
              value={maritalStatusDisplay(patient.maritalStatusCode, maritalStatuses)}
              empty={!patient.maritalStatusCode}
            />
          </dl>
        </PatientDetailDisclosure>

        {satusehat.available ? (
          <PatientDetailDisclosure
            title="SATUSEHAT"
            meta={linkage ? 'Terhubung' : 'Belum terhubung'}
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Status koneksi
                </p>
                <div className="mt-2">
                  <SatusehatLinkageBadge linkage={linkage} resourceName={patient.fullName} />
                </div>
              </div>
              <p className="max-w-sm text-right text-xs leading-relaxed text-muted-foreground">
                Linkage tersimpan menjadi acuan status koneksi pasien.
              </p>
            </div>
            <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <DetailField
                label="Nomor IHS / SATUSEHAT ID"
                value={linkage?.externalResourceId ?? 'Belum terhubung'}
                mono
                empty={!linkage}
              />
              <DetailField label="Versi lokal" value={String(patient.version ?? 1)} mono />
            </dl>
          </PatientDetailDisclosure>
        ) : null}

        <PatientDetailDisclosure
          title="Identifier"
          meta={collectionMeta(identifiers.length, 'identifier')}
          icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
        >
          {identifiers.length ? (
            <div className="space-y-2">
              {identifiers.map((identifier) => (
                <div
                  key={identifier.id}
                  className="grid gap-2 rounded-md border border-border bg-background p-3 text-xs sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {identifier.system === PATIENT_IHS_SYSTEM
                        ? 'Nomor IHS (legacy)'
                        : IDENTIFIER_TYPE_LABELS[identifier.type] ?? identifier.type}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {identifier.isPrimary ? 'Identifier utama' : 'Identifier tambahan'}
                    </p>
                  </div>
                  <p className="break-all font-mono text-foreground">{identifier.value}</p>
                  <p className="text-[11px] text-muted-foreground sm:text-right">
                    {identifier.active ? 'Aktif' : 'Historis'}
                    {' · '}
                    {VERIFICATION_STATUS_LABELS[identifier.verificationStatus] ?? identifier.verificationStatus}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChildText text="Belum ada identifier terstruktur." />
          )}
        </PatientDetailDisclosure>

        <PatientDetailDisclosure
          title="Nama historis & pilihan"
          meta={collectionMeta(names.length, 'nama')}
          icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        >
          {names.length ? (
            <div className="space-y-2">
              {names.map((name) => (
                <div
                  key={name.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{name.text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {NAME_USE_LABELS[name.use] ?? name.use}
                      {name.validTo ? ' · Historis' : ''}
                    </p>
                  </div>
                  {name.validFrom ? (
                    <span className="text-[11px] text-muted-foreground">Mulai {name.validFrom}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyChildText text="Belum ada nama terstruktur." />
          )}
        </PatientDetailDisclosure>

        <PatientDetailDisclosure
          title="Telecom"
          meta={collectionMeta(telecoms.length, 'kontak')}
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
        >
          {telecoms.length ? (
            <div className="space-y-2">
              {telecoms.map((telecom) => (
                <div
                  key={telecom.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 text-xs"
                >
                  <span className="font-semibold text-foreground">{telecom.value}</span>
                  <span className="text-muted-foreground">
                    {TELECOM_SYSTEM_LABELS[telecom.system] ?? telecom.system}
                    {' · '}
                    {TELECOM_USE_LABELS[telecom.use] ?? telecom.use}
                    {' · '}
                    {telecom.active ? 'Aktif' : 'Historis'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChildText text="Belum ada telepon atau email terstruktur." />
          )}
        </PatientDetailDisclosure>

        <PatientDetailDisclosure
          title="Alamat terstruktur"
          meta={collectionMeta(addresses.length, 'alamat')}
          icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
        >
          {addresses.length ? (
            <div className="space-y-2">
              {addresses.map((address) => (
                <div key={address.id} className="rounded-md border border-border bg-background p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      {address.text || address.lines.join(', ') || 'Alamat tanpa teks display'}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {address.active ? 'Aktif' : 'Historis'}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {[
                      address.villageName,
                      address.districtName,
                      address.regencyName,
                      address.provinceName,
                      address.postalCode,
                      address.countryCode,
                    ].filter(Boolean).join(' · ') || 'Wilayah belum dilengkapi'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChildText text="Belum ada alamat terstruktur." />
          )}
        </PatientDetailDisclosure>

        <PatientDetailDisclosure
          title="Relasi pasien"
          meta={collectionMeta(relationships.length, 'relasi')}
          icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        >
          {relationships.length ? (
            <div className="space-y-2">
              {relationships.map((relationship) => (
                <div key={relationship.id} className="rounded-md border border-border bg-background p-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {RELATIONSHIP_LABELS[relationship.relationshipCode] ?? relationship.relationshipCode}
                    </span>
                    <span className="text-muted-foreground">
                      {relationship.active ? 'Aktif' : 'Historis'}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {relationship.relatedPerson?.fullName ?? relationship.relatedPatientId ?? 'Target relasi tidak tersedia'}
                  </p>
                  {relationship.isGuardian ? (
                    <p className="mt-1 text-[11px] font-semibold text-primary">Wali pasien</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyChildText text="Belum ada relasi pasien." />
          )}
        </PatientDetailDisclosure>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-5 border-t border-border bg-card px-4 pb-1 pt-4 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="justify-start sm:mr-auto">
            Tutup
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <PatientSyncReadinessNotice readiness={syncReadiness} compact />
            {canWrite ? (
              <>
                <SatusehatActionGroup
                  resourceName={patient.fullName}
                  onSync={() => onSync(patient)}
                  showLabels
                />
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(patient)}>
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  Edit data lokal
                </Button>
              </>
            ) : null}
            {canCreateQueue ? (
              <Button
                type="button"
                size="sm"
                disabled={patient.active === false}
                title={patient.active === false ? 'Pasien nonaktif tidak dapat masuk antrean' : undefined}
                onClick={() => onQueue(patient)}
              >
                <ListPlus className="h-4 w-4" aria-hidden="true" />
                Masukkan ke antrean
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({
  label,
  value,
  mono = false,
  empty = false,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  empty?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-1 break-words text-sm text-foreground',
          mono && 'break-all font-mono text-xs',
          empty && 'text-muted-foreground italic',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function PatientDetailDisclosure({
  title,
  meta,
  icon,
  children,
}: {
  title: string;
  meta: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-[var(--radius-card)] border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-muted text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{meta}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}

function EmptyChildText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">{text}</p>;
}

function collectionMeta(count: number, label: string) {
  return count === 0 ? 'Belum ada data' : `${count} ${label}`;
}
