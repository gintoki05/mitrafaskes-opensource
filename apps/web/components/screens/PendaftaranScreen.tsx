'use client';

import React, { useState } from 'react';
import { UserPlus, Search, UserCheck, Clock, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { apiFetch, can } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { useSession } from '@/hooks/useSession';

export default function PendaftaranPage() {
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [operationError, setOperationError] = useState('');

  // Form New Patient State
  const [showModal, setShowModal] = useState(false);
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('1992-05-10');
  const [gender, setGender] = useState('MALE');
  const [address, setAddress] = useState('');
  const [phone] = useState('');
  const session = useSession();
  const currentUser = session?.user ?? null;
  const canWritePatient = can(currentUser, AccessPermission.PATIENT_WRITE);
  const canCreateQueue = can(currentUser, AccessPermission.QUEUE_CREATE);
  const {
    patients,
    encounters,
    patientsLoading,
    encountersLoading,
    patientsError,
    encountersError,
    refreshPatients,
    refreshEncounters,
  } = useRegistrationData();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void refreshPatients(search);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationError('');
    setSuccessMessage('');
    try {
      const res = await apiFetch('http://localhost:4000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, fullName, birthDate, gender, address, phone }),
      });
      if (res.ok) {
        setShowModal(false);
        setNik('');
        setFullName('');
        setSuccessMessage('Data pasien berhasil disimpan.');
        void refreshPatients();
      } else {
        throw new Error('Data pasien tidak dapat disimpan.');
      }
    } catch (e) {
      console.error(e);
      setOperationError(e instanceof Error ? e.message : 'Data pasien tidak dapat disimpan.');
    }
  };

  const handleDaftarAntrean = async (patientId: string) => {
    setOperationError('');
    setSuccessMessage('');
    try {
      const res = await apiFetch('http://localhost:4000/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, doctorId: 'doc-001' }),
      });
      if (res.ok) {
        setSuccessMessage('Pasien berhasil ditambahkan ke antrean.');
        void refreshEncounters();
      } else {
        throw new Error('Pasien tidak dapat ditambahkan ke antrean.');
      }
    } catch (e) {
      console.error(e);
      setOperationError(e instanceof Error ? e.message : 'Pasien tidak dapat ditambahkan ke antrean.');
    }
  };

  return (
    <RouteGuard permission={AccessPermission.QUEUE_READ}>
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader
        icon={<UserCheck className="h-6 w-6" />}
        title="Pendaftaran Pasien & Antrean Poli Rawat Jalan"
        description="Pencarian master pasien, pendaftaran NIK SATUSEHAT, dan penjadwalan antrean dokter."
        action={canWritePatient ? (
          <Button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold shadow-md shadow-primary/20"
          >
            <UserPlus className="h-4 w-4 stroke-[2.5]" />
            Daftar Pasien Baru
          </Button>
        ) : undefined}
      />

      {successMessage ? (
        <ScreenState kind="success" title="Tindakan berhasil" description={successMessage} compact />
      ) : null}
      {patientsError || encountersError || operationError ? (
        <ScreenState
          kind="error"
          title="Sebagian data tidak dapat dimuat"
          description={[patientsError, encountersError, operationError].filter(Boolean).join(' ')}
          compact
        />
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Left Column: Patient Search & List */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <label htmlFor="patient-search" className="sr-only">Cari pasien</label>
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="patient-search"
                    type="text"
                    placeholder="Cari berdasarkan NIK (16-Digit), No. RM, atau Nama Pasien..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
                <Button type="submit" variant="secondary" className="border-primary/20 text-xs font-semibold text-primary">
                  Cari
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
              <CardTitle className="text-sm font-bold text-foreground">Daftar Master Pasien</CardTitle>
              <Badge variant="outline" className="border-primary/30 text-xs font-semibold text-primary">
                {patients.length} Pasien
              </Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {patientsLoading ? (
                <div className="p-4">
                  <ScreenState kind="loading" title="Memuat daftar pasien" description="Mohon tunggu sebentar." compact />
                </div>
              ) : patients.length === 0 && !patientsError ? (
                <div className="p-4">
                  <ScreenState
                    kind="empty"
                    title={search ? 'Pasien tidak ditemukan' : 'Belum ada pasien'}
                    description={search ? 'Coba gunakan NIK, nomor rekam medis, atau nama lain.' : 'Daftar pasien akan tampil setelah data tersedia.'}
                  />
                </div>
              ) : patients.map(p => (
                <div key={p.id} className="flex min-w-0 flex-col items-start justify-between gap-4 p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 text-sm font-bold text-foreground">{p.fullName}</span>
                      <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        {p.medicalRecNo}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>NIK: <strong className="font-mono text-foreground">{p.nik}</strong></span>
                      <span>Gender: <strong className="text-foreground">{p.gender === 'MALE' ? 'Laki-Laki' : 'Perempuan'}</strong></span>
                      {p.satusehatId && (
                        <span className="flex items-center gap-1 font-mono text-success">
                          <ShieldCheck className="w-3 h-3 inline" /> SATUSEHAT ID: {p.satusehatId}
                        </span>
                      )}
                    </div>
                  </div>
                  {canCreateQueue && <Button
                    onClick={() => handleDaftarAntrean(p.id)}
                    size="sm"
                    className="shrink-0 border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15"
                  >
                    + Masuk Antrean
                  </Button>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Active Queue Status */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-success" />
                Antrean Rawat Jalan
              </CardTitle>
              <Badge className="border-success/20 bg-success/10 font-mono text-xs font-bold text-success">
                {encounters.length} Antrean
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {encountersLoading ? (
                <ScreenState kind="loading" title="Memuat antrean" compact />
              ) : encounters.length === 0 && !encountersError ? (
                <ScreenState
                  kind="empty"
                  title="Antrean masih kosong"
                  description="Pasien yang didaftarkan ke poli akan muncul di sini."
                />
              ) : encounters.map(e => (
                <div key={e.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-primary/20 bg-primary/10 font-mono text-sm font-bold text-primary">
                      #{e.queueNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-foreground">{e.patient?.fullName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{e.patient?.medicalRecNo}</div>
                    </div>
                  </div>
                  <Badge
                    className={
                      e.status === 'WAITING'
                        ? 'clinical-status-warning border text-[10px] font-bold'
                        : e.status === 'IN_PROGRESS'
                        ? 'border border-primary/20 bg-primary/10 text-[10px] font-bold text-primary'
                        : 'clinical-status-success border text-[10px] font-bold'
                    }
                  >
                    {e.status === 'WAITING' ? 'MENUNGGU' : e.status === 'IN_PROGRESS' ? 'DIPERIKSA' : 'SELESAI'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Registration Pasien */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/20 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setShowModal(false);
          }}
        >
          <Card className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto">
            <CardHeader>
              <CardTitle id="registration-title" className="flex items-center gap-2 text-base font-bold text-foreground">
                <UserPlus className="h-5 w-5 text-primary" />
                Pendaftaran Pasien Baru SATUSEHAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePatient} className="space-y-3">
                <div>
                  <label htmlFor="registration-nik" className="mb-1 block text-xs font-semibold text-foreground">NIK (16 Digit Sesuai KTP)</label>
                  <Input
                    id="registration-nik"
                    type="text"
                    maxLength={16}
                    value={nik}
                    onChange={e => setNik(e.target.value)}
                    placeholder="Contoh: 3171012304900001"
                    className="text-xs font-mono"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label htmlFor="registration-name" className="mb-1 block text-xs font-semibold text-foreground">Nama Lengkap Pasien</label>
                  <Input
                    id="registration-name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nama sesuai KTP"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="registration-birth-date" className="mb-1 block text-xs font-semibold text-foreground">Tanggal Lahir</label>
                    <Input
                      id="registration-birth-date"
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="registration-gender" className="mb-1 block text-xs font-semibold text-foreground">Jenis Kelamin</label>
                    <select
                      id="registration-gender"
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="clinical-field w-full px-3 py-2 text-xs"
                    >
                      <option value="MALE">Laki-Laki</option>
                      <option value="FEMALE">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="registration-address" className="mb-1 block text-xs font-semibold text-foreground">Alamat Tempat Tinggal</label>
                  <Input
                    id="registration-address"
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Jl. Melati No. 12..."
                    className="text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    className="text-xs font-semibold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/85"
                  >
                    Simpan Pasien
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
