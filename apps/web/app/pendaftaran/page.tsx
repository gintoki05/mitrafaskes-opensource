'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, Search, UserCheck, Clock, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { apiFetch, can, getSession } from '@/lib/auth';

export default function PendaftaranPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Form New Patient State
  const [showModal, setShowModal] = useState(false);
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('1992-05-10');
  const [gender, setGender] = useState('MALE');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const currentUser = getSession()?.user ?? null;
  const canWritePatient = can(currentUser, AccessPermission.PATIENT_WRITE);
  const canCreateQueue = can(currentUser, AccessPermission.QUEUE_CREATE);

  const fetchPatients = async (query = '') => {
    try {
      const res = await apiFetch(`http://localhost:4000/api/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPatients(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEncounters = async () => {
    try {
      const res = await apiFetch('http://localhost:4000/api/encounters');
      const data = await res.json();
      setEncounters(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchEncounters();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
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
        fetchPatients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDaftarAntrean = async (patientId: string) => {
    try {
      const res = await apiFetch('http://localhost:4000/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, doctorId: 'doc-001' }),
      });
      if (res.ok) {
        fetchEncounters();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.QUEUE_READ}>
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="clinical-panel flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <UserCheck className="h-6 w-6 text-primary" />
            Pendaftaran Pasien & Antrean Poli Rawat Jalan
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Pencarian Master Pasien, Pendaftaran NIK SATUSEHAT, dan Penjadwalan Antrean Dokter
          </p>
        </div>
        {canWritePatient && <Button
          onClick={() => setShowModal(true)}
          className="bg-primary text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/85"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5] mr-1.5" />
          Daftar Pasien Baru
        </Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Patient Search & List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
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
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Daftar Master Pasien</CardTitle>
              <Badge variant="outline" className="border-primary/30 text-xs font-semibold text-primary">
                {patients.length} Pasien
              </Badge>
            </CardHeader>
            <div className="divide-y divide-border">
              {patients.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{p.fullName}</span>
                      <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        {p.medicalRecNo}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-success" />
                Antrean Rawat Jalan
              </CardTitle>
              <Badge className="border-success/20 bg-success/10 font-mono text-xs font-bold text-success">
                {encounters.length} Antrean
              </Badge>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {encounters.map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-background p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-primary/20 bg-primary/10 font-mono text-sm font-bold text-primary">
                      #{e.queueNumber}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{e.patient?.fullName}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <UserPlus className="h-5 w-5 text-primary" />
                Pendaftaran Pasien Baru SATUSEHAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePatient} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">NIK (16 Digit Sesuai KTP)</label>
                  <Input
                    type="text"
                    maxLength={16}
                    value={nik}
                    onChange={e => setNik(e.target.value)}
                    placeholder="Contoh: 3171012304900001"
                    className="text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Nama Lengkap Pasien</label>
                  <Input
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
                    <label className="mb-1 block text-xs font-semibold text-foreground">Tanggal Lahir</label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">Jenis Kelamin</label>
                    <select
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
                  <label className="mb-1 block text-xs font-semibold text-foreground">Alamat Tempat Tinggal</label>
                  <Input
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
