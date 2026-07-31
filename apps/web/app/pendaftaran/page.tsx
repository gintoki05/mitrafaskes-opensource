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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-400" />
            Pendaftaran Pasien & Antrean Poli Rawat Jalan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pencarian Master Pasien, Pendaftaran NIK SATUSEHAT, dan Penjadwalan Antrean Dokter
          </p>
        </div>
        {canWritePatient && <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5] mr-1.5" />
          Daftar Pasien Baru
        </Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Patient Search & List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardContent className="p-4">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    type="text"
                    placeholder="Cari berdasarkan NIK (16-Digit), No. RM, atau Nama Pasien..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-700 text-white placeholder-slate-500 text-xs"
                  />
                </div>
                <Button type="submit" variant="secondary" className="text-teal-400 border border-teal-500/20 text-xs font-semibold">
                  Cari
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-200">Daftar Master Pasien</CardTitle>
              <Badge variant="outline" className="text-teal-400 border-teal-500/30 text-xs font-semibold">
                {patients.length} Pasien
              </Badge>
            </CardHeader>
            <div className="divide-y divide-slate-800/60">
              {patients.map(p => (
                <div key={p.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.fullName}</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono font-bold">
                        {p.medicalRecNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>NIK: <strong className="text-slate-300 font-mono">{p.nik}</strong></span>
                      <span>Gender: <strong className="text-slate-300">{p.gender === 'MALE' ? 'Laki-Laki' : 'Perempuan'}</strong></span>
                      {p.satusehatId && (
                        <span className="text-emerald-400 font-mono flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 inline" /> SATUSEHAT ID: {p.satusehatId}
                        </span>
                      )}
                    </div>
                  </div>
                  {canCreateQueue && <Button
                    onClick={() => handleDaftarAntrean(p.id)}
                    size="sm"
                    className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold shrink-0"
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
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Antrean Rawat Jalan
              </CardTitle>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono font-bold text-xs">
                {encounters.length} Antrean
              </Badge>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {encounters.map(e => (
                <div key={e.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 font-mono text-sm">
                      #{e.queueNumber}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{e.patient?.fullName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{e.patient?.medicalRecNo}</div>
                    </div>
                  </div>
                  <Badge
                    className={
                      e.status === 'WAITING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-bold'
                        : e.status === 'IN_PROGRESS'
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 animate-pulse text-[10px] font-bold'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold'
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-slate-900 border-slate-800 w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                Pendaftaran Pasien Baru SATUSEHAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePatient} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">NIK (16 Digit Sesuai KTP)</label>
                  <Input
                    type="text"
                    maxLength={16}
                    value={nik}
                    onChange={e => setNik(e.target.value)}
                    placeholder="Contoh: 3171012304900001"
                    className="bg-slate-950 border-slate-700 text-white text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Pasien</label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nama sesuai KTP"
                    className="bg-slate-950 border-slate-700 text-white text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Lahir</label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Kelamin</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="MALE">Laki-Laki</option>
                      <option value="FEMALE">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Tempat Tinggal</label>
                  <Input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Jl. Melati No. 12..."
                    className="bg-slate-950 border-slate-700 text-white text-xs"
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
                    className="bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400"
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
