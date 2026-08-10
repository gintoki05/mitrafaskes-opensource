'use client';

import type { SubmitEventHandler } from 'react';
import type {
  ListMeta,
  MaritalStatusSummary,
  Patient,
  PatientStatusCounts,
} from '@mitrafaskes/shared';
import { Edit3, Eye, ListPlus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenState } from '@/components/ScreenState';
import { PaginationControl } from '@/components/ui/pagination';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { cn } from '@/lib/utils';
import { maritalStatusDisplay } from './marital-status-display';
import { PatientSyncReadinessNotice } from './PatientSyncReadinessNotice';
import { getPatientSyncReadiness } from './patient-sync-readiness';
import { PatientStatusBadge } from './PatientStatusBadge';

type PatientDirectoryProps = {
  patients: Patient[];
  patientsLoading: boolean;
  patientsError: string;
  meta: ListMeta;
  search: string;
  canCreateQueue: boolean;
  canWritePatient: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: SubmitEventHandler<HTMLFormElement>;
  onPageChange: (page: number) => void;
  onQueuePatient: (patient: Patient) => void;
  onViewPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onSyncPatient: (patient: Patient) => void;
  maritalStatuses: readonly MaritalStatusSummary[];
  statusCounts: PatientStatusCounts;
  statusFilter: boolean | undefined;
  onStatusFilterChange: (active: boolean | undefined) => void;
};

export function PatientDirectory({
  patients,
  patientsLoading,
  patientsError,
  meta,
  search,
  canCreateQueue,
  canWritePatient,
  onSearchChange,
  onSearchSubmit,
  onPageChange,
  onQueuePatient,
  onViewPatient,
  onEditPatient,
  onSyncPatient,
  maritalStatuses,
  statusCounts,
  statusFilter,
  onStatusFilterChange,
}: PatientDirectoryProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const firstItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastItem = Math.min(meta.total, meta.page * meta.pageSize);
  const statusFilterLabel =
    statusFilter === true ? 'aktif' : statusFilter === false ? 'nonaktif' : null;
  const statusFilterOptions = [
    { value: true, label: 'Aktif', count: statusCounts.active },
    { value: false, label: 'Nonaktif', count: statusCounts.inactive },
    { value: undefined, label: 'Semua', count: statusCounts.active + statusCounts.inactive },
  ] as const;

  return (
    <section className="data-surface" aria-labelledby="patient-directory-title">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 id="patient-directory-title" className="text-base font-bold text-foreground">Pasien terdaftar</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Lihat detail, edit data, atau masukkan pasien ke antrean.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          <strong className="font-mono text-foreground">{meta.total}</strong>{' '}
          {statusFilterLabel ? `pasien ${statusFilterLabel}` : 'pasien tampil'}
        </span>
      </div>
      <div className="data-toolbar">
        <form onSubmit={onSearchSubmit} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-xl">
            <label htmlFor="patient-search" className="sr-only">Cari pasien</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="patient-search"
              type="search"
              placeholder="Cari NIK, No. RM, atau nama pasien"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-10 pl-9 text-sm"
            />
          </div>
          <Button type="submit" size="sm" className="sm:h-10 sm:px-4">Cari data</Button>
        </form>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter status pasien">
          <span className="mr-1 text-xs font-semibold text-foreground">Status</span>
          {statusFilterOptions.map((option) => {
            const selected = statusFilter === option.value;

            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={selected}
                disabled={patientsLoading}
                onClick={() => onStatusFilterChange(option.value)}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{option.label}</span>
                <Badge variant={selected ? 'default' : 'outline'} className="h-5 min-w-5 px-1.5 text-[11px]">
                  {option.count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <caption className="sr-only">Daftar pasien terdaftar</caption>
          <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th scope="col" className="w-16 border-b border-border px-4 py-3 text-center">No.</th>
              <th scope="col" className="border-b border-border px-4 py-3">Nama Pasien</th>
              <th scope="col" className="border-b border-border px-4 py-3">No. Rekam Medis</th>
              <th scope="col" className="border-b border-border px-4 py-3">Identitas</th>
              <th scope="col" className="border-b border-border px-4 py-3">Status</th>
              <th scope="col" className="border-b border-border px-4 py-3">SATUSEHAT</th>
              <th scope="col" className="w-48 border-b border-border px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {patientsLoading ? (
              <tr>
                <td colSpan={7} className="p-4">
                  <ScreenState kind="loading" title="Memuat daftar pasien" description="Mohon tunggu sebentar." compact />
                </td>
              </tr>
            ) : patients.length === 0 && !patientsError ? (
              <tr>
                <td colSpan={7} className="p-4">
                  <ScreenState
                    kind="empty"
                    title={search ? 'Pasien tidak ditemukan' : statusFilterLabel ? `Belum ada pasien ${statusFilterLabel}` : 'Belum ada pasien'}
                    description={search ? 'Coba gunakan NIK, nomor rekam medis, atau nama lain.' : statusFilterLabel ? `Tidak ada pasien ${statusFilterLabel}.` : 'Daftar pasien akan tampil setelah data tersedia.'}
                    action={!search && statusFilter !== undefined ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => onStatusFilterChange(undefined)}>
                        Tampilkan semua
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : patients.map((patient, index) => {
              const syncReadiness = getPatientSyncReadiness(patient);

              return (
              <tr key={patient.id} className="group transition-colors hover:bg-primary/[0.035]">
                <td className="px-4 py-4 text-center font-mono text-xs text-muted-foreground">{firstItem + index}</td>
                <td className="max-w-[18rem] px-4 py-4">
                  <div className="truncate text-sm font-bold text-foreground">{patient.fullName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Perkawinan: {maritalStatusDisplay(patient.maritalStatusCode, maritalStatuses)}
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs font-semibold text-foreground">{patient.medicalRecNo}</td>
                <td className="px-4 py-4">
                  <div className="font-mono text-xs text-foreground">{patient.nik ?? 'Belum diisi'}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">NIK terdaftar</div>
                </td>
                <td className="px-4 py-4">
                  <PatientStatusBadge active={patient.active} />
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    <SatusehatLinkageBadge
                      linkage={patient.satusehat}
                      resourceName={patient.fullName}
                    />
                    {patient.satusehatSync?.status === 'FAILED' ? (
                      <p className="max-w-[14rem] text-[11px] text-destructive" title={patient.satusehatSync.errorMessage}>
                        Sync terakhir gagal{patient.satusehatSync.errorMessage ? `: ${patient.satusehatSync.errorMessage}` : ''}
                      </p>
                    ) : null}
                    <PatientSyncReadinessNotice readiness={syncReadiness} compact />
                  </div>
                </td>
                <td className="w-48 px-4 py-4 align-middle text-right">
                  <div
                    className="flex flex-wrap items-center justify-end gap-1"
                    role="group"
                    aria-label={`Aksi untuk ${patient.fullName}`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onViewPatient(patient)}
                      aria-label={`Lihat detail ${patient.fullName}`}
                      title={`Lihat detail ${patient.fullName}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {canWritePatient ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEditPatient(patient)}
                        aria-label={`Edit lokal ${patient.fullName}`}
                        title={`Edit lokal ${patient.fullName}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                    {canWritePatient ? (
                      <SatusehatActionGroup
                        resourceName={patient.fullName}
                        onSync={() => onSyncPatient(patient)}
                      />
                    ) : null}
                    {canCreateQueue ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        disabled={patient.active === false}
                        onClick={() => onQueuePatient(patient)}
                        aria-label={`Masukkan ${patient.fullName} ke antrean`}
                        title={patient.active === false ? 'Pasien nonaktif tidak dapat masuk antrean' : `Masukkan ${patient.fullName} ke antrean`}
                        className="border-primary/35 bg-card text-primary hover:bg-primary/5"
                      >
                        <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Menampilkan <strong className="text-foreground">{firstItem}-{lastItem}</strong>{' '}
          dari <strong className="text-foreground">{meta.total}</strong> pasien
        </span>
        {totalPages > 1 ? (
          <PaginationControl
            page={meta.page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={patientsLoading}
            showLabels={false}
            aria-label="Navigasi halaman daftar pasien"
            className="mx-0 w-auto"
          />
        ) : null}
      </div>
    </section>
  );
}
