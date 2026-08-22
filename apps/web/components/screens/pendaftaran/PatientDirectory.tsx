'use client';

import type { SubmitEventHandler } from 'react';
import type {
  Encounter,
  ListMeta,
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
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';
import { PatientSyncReadinessNotice } from './PatientSyncReadinessNotice';
import { getPatientSyncReadiness } from './patient-sync-readiness';
import { PatientEncounterStatusBadge } from './PatientEncounterStatusBadge';
import { getLatestPatientEncounter } from './patient-encounter-status';
import { PatientStatusBadge } from './PatientStatusBadge';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

type PatientDirectoryProps = {
  patients: Patient[];
  todayEncounters: Encounter[];
  todayEncountersLoading: boolean;
  todayEncountersError: string;
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
  statusCounts: PatientStatusCounts;
  statusFilter: boolean | undefined;
  onStatusFilterChange: (active: boolean | undefined) => void;
};

export function PatientDirectory({
  patients,
  todayEncounters,
  todayEncountersLoading,
  todayEncountersError,
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
  statusCounts,
  statusFilter,
  onStatusFilterChange,
}: PatientDirectoryProps) {
  const satusehat = useIntegrationCapability('SATUSEHAT');
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
          <h2 id="patient-directory-title" className="text-lg font-semibold text-foreground">Pasien terdaftar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Lihat detail, edit data, masukkan pasien ke antrean, dan pantau status kunjungan lokal hari ini.
          </p>
          {todayEncountersError ? (
            <p className="mt-2 text-xs text-destructive" role="status">
              Status kunjungan hari ini belum tersedia. Muat ulang antrean untuk mencoba lagi.
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          <strong className="font-mono text-foreground">{meta.total}</strong>{' '}
          {statusFilterLabel ? `pasien ${statusFilterLabel}` : 'pasien tampil'}
        </span>
      </div>
      <div className="data-toolbar">
        <form onSubmit={onSearchSubmit} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-xl">
            <label htmlFor="patient-search" className="sr-only">Cari pasien</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="patient-search"
              type="search"
              placeholder="Cari NIK, No. RM, atau nama pasien"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 pl-9 text-sm"
            />
          </div>
          <Button type="submit" className="sm:h-11 sm:px-4">Cari data</Button>
        </form>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter status pasien">
          <span className="mr-1 text-sm font-medium text-foreground">Status pasien</span>
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
                  'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
                  selected
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{option.label}</span>
                <Badge variant={selected ? 'default' : 'outline'} className="h-5 min-w-5 px-1.5 text-xs">
                  {option.count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <caption className="sr-only">Daftar pasien terdaftar</caption>
          <thead className="bg-muted/35 text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            <tr>
              <th scope="col" className="w-16 border-b border-border px-4 py-3 text-center">No.</th>
              <th scope="col" className="border-b border-border px-4 py-3">Nama Pasien</th>
              <th scope="col" className="border-b border-border px-4 py-3">No. Rekam Medis</th>
              <th scope="col" className="border-b border-border px-4 py-3">Identitas</th>
              <th scope="col" className="border-b border-border px-4 py-3">Status pasien</th>
              <th scope="col" className="border-b border-border px-4 py-3">Kunjungan lokal</th>
              {satusehat.available ? (
                <th scope="col" className="border-b border-border px-4 py-3">SATUSEHAT</th>
              ) : null}
              <th scope="col" className="w-40 border-b border-border px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {patientsLoading ? (
              <tr>
                <td colSpan={satusehat.available ? 8 : 7} className="p-4">
                  <ScreenState kind="loading" title="Memuat daftar pasien" description="Mohon tunggu sebentar." compact />
                </td>
              </tr>
            ) : patients.length === 0 && !patientsError ? (
              <tr>
                <td colSpan={satusehat.available ? 8 : 7} className="p-4">
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
              const todayEncounter = getLatestPatientEncounter(todayEncounters, patient.id);

              return (
              <tr key={patient.id} className="group transition-colors hover:bg-muted/45">
                <td className="px-4 py-3 text-center font-mono text-sm text-muted-foreground">{firstItem + index}</td>
                <td className="max-w-[16rem] px-4 py-3">
                  <div className="truncate text-sm font-semibold text-foreground">{patient.fullName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</div>
                </td>
                <td className="px-4 py-3 font-mono text-sm font-medium text-foreground">{patient.medicalRecNo}</td>
                <td className="px-4 py-3 font-mono text-sm text-foreground">
                  {patient.nik ?? 'Belum diisi'}
                </td>
                <td className="px-4 py-3">
                  <PatientStatusBadge active={patient.active} />
                </td>
                <td className="px-4 py-3">
                  <PatientEncounterStatusBadge
                    encounter={todayEncounter}
                    loading={todayEncountersLoading}
                    unavailable={Boolean(todayEncountersError)}
                    unavailableMessage={todayEncountersError}
                  />
                </td>
                {satusehat.available ? (
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <SatusehatLinkageBadge
                        linkage={getIntegrationLinkage(patient.integrations, 'SATUSEHAT')}
                        resourceName={patient.fullName}
                      />
                      {getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.status === 'FAILED' ? (
                        <p
                          className="max-w-[14rem] text-xs text-destructive"
                          title={getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.errorMessage}
                        >
                          Sinkronisasi terakhir gagal
                          {getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.errorMessage
                            ? `: ${getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.errorMessage}`
                            : ''}
                        </p>
                      ) : null}
                      <PatientSyncReadinessNotice readiness={syncReadiness} compact />
                    </div>
                  </td>
                ) : null}
                <td className="w-40 px-4 py-3 align-middle text-right">
                  <div
                    className="flex flex-wrap items-center justify-end gap-1.5"
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
                        variant="default"
                        size="icon-sm"
                        disabled={patient.active === false}
                        onClick={() => onQueuePatient(patient)}
                        aria-label={`Masukkan ${patient.fullName} ke antrean`}
                        title={patient.active === false ? 'Pasien nonaktif tidak dapat masuk antrean' : `Masukkan ${patient.fullName} ke antrean`}
                        className="shadow-none"
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
      <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
