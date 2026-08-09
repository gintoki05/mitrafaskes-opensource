'use client';

import type { SubmitEventHandler } from 'react';
import type { MaritalStatusSummary, Patient } from '@mitrafaskes/shared';
import { Edit3, Eye, Filter, ListPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { maritalStatusDisplay } from './marital-status-display';

type PatientDirectoryProps = {
  patients: Patient[];
  patientsLoading: boolean;
  patientsError: string;
  search: string;
  canCreateQueue: boolean;
  canWritePatient: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: SubmitEventHandler<HTMLFormElement>;
  onQueuePatient: (patientId: string) => void;
  onViewPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onSyncPatient: (patient: Patient) => void;
  maritalStatuses: readonly MaritalStatusSummary[];
};

export function PatientDirectory({
  patients,
  patientsLoading,
  patientsError,
  search,
  canCreateQueue,
  canWritePatient,
  onSearchChange,
  onSearchSubmit,
  onQueuePatient,
  onViewPatient,
  onEditPatient,
  onSyncPatient,
  maritalStatuses,
}: PatientDirectoryProps) {
  return (
    <section className="data-surface" aria-labelledby="patient-directory-title">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 id="patient-directory-title" className="text-base font-bold text-foreground">Data pasien terdaftar</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Database identitas pasien yang dapat dipakai untuk pendaftaran kunjungan.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          <strong className="font-mono text-foreground">{patients.length}</strong> pasien tampil
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Filter aktif:</span>
          <strong className="font-mono text-foreground">{patients.length}</strong>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <caption className="sr-only">Daftar pasien terdaftar</caption>
          <thead className="bg-muted/60 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th scope="col" className="w-16 border-b border-border px-4 py-3 text-center">No.</th>
              <th scope="col" className="border-b border-border px-4 py-3">Nama Pasien</th>
              <th scope="col" className="border-b border-border px-4 py-3">No. Rekam Medis</th>
              <th scope="col" className="border-b border-border px-4 py-3">Identitas</th>
              <th scope="col" className="border-b border-border px-4 py-3">SATUSEHAT</th>
              <th scope="col" className="w-48 border-b border-border px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {patientsLoading ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <ScreenState kind="loading" title="Memuat daftar pasien" description="Mohon tunggu sebentar." compact />
                </td>
              </tr>
            ) : patients.length === 0 && !patientsError ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <ScreenState
                    kind="empty"
                    title={search ? 'Pasien tidak ditemukan' : 'Belum ada pasien'}
                    description={search ? 'Coba gunakan NIK, nomor rekam medis, atau nama lain.' : 'Daftar pasien akan tampil setelah data tersedia.'}
                  />
                </td>
              </tr>
            ) : patients.map((patient, index) => (
              <tr key={patient.id} className="group transition-colors hover:bg-primary/[0.035]">
                <td className="px-4 py-4 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
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
                        onClick={() => onQueuePatient(patient.id)}
                        aria-label={`Masukkan ${patient.fullName} ke antrean`}
                        title={`Masukkan ${patient.fullName} ke antrean`}
                        className="border-primary/35 bg-card text-primary hover:bg-primary/5"
                      >
                        <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Menampilkan <strong className="text-foreground">{patients.length}</strong> pasien</span>
        <span>Gunakan kolom pencarian untuk menemukan data lebih cepat.</span>
      </div>
    </section>
  );
}
