'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, Search, UserCheck, Clock } from 'lucide-react';

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

  const fetchPatients = async (query = '') => {
    try {
      const res = await fetch(`http://localhost:4000/api/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPatients(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEncounters = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/encounters');
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
      const res = await fetch('http://localhost:4000/api/patients', {
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
      const res = await fetch('http://localhost:4000/api/encounters', {
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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-teal-400" />
            Pendaftaran Pasien & Antrean Poli Rawat Jalan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pencarian Master Pasien, Pendaftaran Pasien Baru, dan Penjadwalan Antrean Dokter
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Daftar Pasien Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Patient Search & List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan NIK, No. RM, atau Nama Pasien..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-400 border border-teal-500/20 transition-all"
              >
                Cari
              </button>
            </form>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200">Daftar Pasien Terdaftar</h2>
              <span className="text-[11px] text-teal-400 font-semibold">{patients.length} Pasien</span>
            </div>
            <div className="divide-y divide-slate-800/60">
              {patients.map(p => (
                <div key={p.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{p.fullName}</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono">
                        {p.medicalRecNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>NIK: <strong className="text-slate-300 font-mono">{p.nik}</strong></span>
                      <span>Gender: <strong className="text-slate-300">{p.gender === 'MALE' ? 'Laki-Laki' : 'Perempuan'}</strong></span>
                      <span>SATUSEHAT ID: <strong className="text-emerald-400 font-mono">{p.satusehatId || '-'}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDaftarAntrean(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    + Masuk Antrean
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Queue Status */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Antrean Rawat Jalan Hari Ini
              </h2>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold font-mono">
                {encounters.length} Antrean
              </span>
            </div>

            <div className="space-y-3">
              {encounters.map(e => (
                <div key={e.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 font-mono text-sm">
                      #{e.queueNumber}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{e.patient?.fullName}</div>
                      <div className="text-[11px] text-slate-400">{e.patient?.medicalRecNo}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      e.status === 'WAITING'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : e.status === 'IN_PROGRESS'
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {e.status === 'WAITING' ? 'MENUNGGU' : e.status === 'IN_PROGRESS' ? 'DIPERIKSA' : 'SELESAI'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Registration Pasien */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-400" />
              Pendaftaran Pasien Baru
            </h2>

            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">NIK (Sesuai KTP)</label>
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={e => setNik(e.target.value)}
                  placeholder="Contoh: 3171012304900001"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap Pasien</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nama sesuai KTP"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
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
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Jl. Melati No. 12..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 shadow-md shadow-teal-500/20"
                >
                  Simpan Pasien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
