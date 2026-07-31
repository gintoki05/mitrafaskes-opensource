'use client';

import React, { useEffect, useState } from 'react';
import { Stethoscope, Activity, Heart, Thermometer, User, FileText, CheckCircle, Plus, Trash2, Search, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { apiFetch } from '@/lib/auth';

export default function RmePage() {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null);

  // Form RME State
  const [anamnesis, setAnamnesis] = useState('Pasien mengeluh demam dan batuk sejak 2 hari yang lalu.');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('78');
  const [temperature, setTemperature] = useState('37.2');

  // ICD-10 Search & Selected Diagnoses
  const [icdSearch, setIcdSearch] = useState('');
  const [icdResults, setIcdResults] = useState<any[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<{ icd10Code: string; nameIndo: string; isPrimary: boolean }[]>([
    { icd10Code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', isPrimary: true }
  ]);

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState<{ medicineName: string; dosage: string; frequency: string; quantity: number }[]>([
    { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
    { medicineName: 'Amoxicillin 500mg', dosage: '1 Kaplet', frequency: '3x Sehari sesudah makan', quantity: 15 }
  ]);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchEncounters = async () => {
    try {
      const res = await apiFetch('http://localhost:4000/api/encounters');
      const data = await res.json();
      setEncounters(data);
      if (data.length > 0 && !selectedEncounter) {
        setSelectedEncounter(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const searchIcd10 = async (q: string) => {
    try {
      const res = await apiFetch(`http://localhost:4000/api/master/icd10?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setIcdResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEncounters();
    searchIcd10('');

    // Keyboard Shortcut Handler: Ctrl + Enter to save RME
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-save-rme');
        if (submitBtn) submitBtn.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEncounter]);

  const handleAddDiagnosis = (icd: any) => {
    if (!selectedDiagnoses.some(d => d.icd10Code === icd.code)) {
      setSelectedDiagnoses([...selectedDiagnoses, { icd10Code: icd.code, nameIndo: icd.nameIndo, isPrimary: selectedDiagnoses.length === 0 }]);
    }
    setIcdSearch('');
  };

  const handleRemoveDiagnosis = (code: string) => {
    setSelectedDiagnoses(selectedDiagnoses.filter(d => d.icd10Code !== code));
  };

  const handleAddPrescription = () => {
    setPrescriptions([...prescriptions, { medicineName: '', dosage: '1 Tablet', frequency: '3x Sehari', quantity: 10 }]);
  };

  // Preset Template Resep Paket Obat (One-Click Bundles)
  const applyPresetBundle = (type: 'ISPA' | 'GASTRITIS' | 'HYPERTENSION') => {
    if (type === 'ISPA') {
      setSelectedDiagnoses([{ icd10Code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', isPrimary: true }]);
      setPrescriptions([
        { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'CTM 4mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'Vitamin C 50mg', dosage: '1 Tablet', frequency: '2x Sehari sesudah makan', quantity: 10 }
      ]);
    } else if (type === 'GASTRITIS') {
      setSelectedDiagnoses([{ icd10Code: 'K29.7', nameIndo: 'Gastritis, Tidak Spesifik (Sakit Maag)', isPrimary: true }]);
      setPrescriptions([
        { medicineName: 'Antasida Doen', dosage: '1 Tablet Kunyah', frequency: '3x Sehari sebelum makan', quantity: 12 },
        { medicineName: 'Omeprazole 20mg', dosage: '1 Kapsul', frequency: '2x Sehari sebelum makan', quantity: 10 }
      ]);
    } else if (type === 'HYPERTENSION') {
      setSelectedDiagnoses([{ icd10Code: 'I10', nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)', isPrimary: true }]);
      setPrescriptions([
        { medicineName: 'Amlodipine 5mg', dosage: '1 Tablet', frequency: '1x Sehari pagi hari', quantity: 30 }
      ]);
    }
  };

  const handleSaveRme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEncounter) return;

    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await apiFetch('http://localhost:4000/api/rme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: selectedEncounter.id,
          anamnesis,
          systolic,
          diastolic,
          heartRate,
          temperature,
          diagnoses: selectedDiagnoses,
          prescriptions,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Rekam Medis (RME) Berhasil Disimpan & Otomatis Ditransformasikan ke SATUSEHAT Kemenkes RI!');
        fetchEncounters();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.RME_READ}>
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-400" />
            Form Rekam Medis Elektronik (RME) Dokter
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Input Anamnesis, Vital Signs, Diagnosis ICD-10, dan E-Resep Obat Pasien Rawat Jalan
          </p>
        </div>

        {/* Quick Shortcut Badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Shortcut: <strong>Ctrl + Enter</strong> untuk Simpan</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Select Patient Queue */}
        <div className="space-y-4">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Pilih Antrean Pasien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {encounters.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEncounter(e)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedEncounter?.id === e.id
                      ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-md shadow-teal-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{e.patient?.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-400">{e.patient?.medicalRecNo}</div>
                  </div>
                  <Badge className="bg-slate-800 text-teal-400 font-mono font-bold text-xs">
                    #{e.queueNumber}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: RME Main Form */}
        <div className="lg:col-span-3 space-y-6">
          {selectedEncounter ? (
            <form onSubmit={handleSaveRme} className="space-y-6">
              {/* Patient Info Banner */}
              <div className="bg-slate-900/90 border border-teal-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{selectedEncounter.patient?.fullName}</div>
                    <div className="text-xs text-slate-400 flex gap-3 font-mono">
                      <span>No. RM: {selectedEncounter.patient?.medicalRecNo}</span>
                      <span>NIK: {selectedEncounter.patient?.nik}</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-teal-500/10 border-teal-500/30 text-teal-400 text-xs font-semibold">
                  Rawat Jalan - Poli Umum
                </Badge>
              </div>

              {/* 1. Anamnesis */}
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400" />
                    1. Anamnesis & Keluhan Utama
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    rows={3}
                    value={anamnesis}
                    onChange={e => setAnamnesis(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                    placeholder="Input keluhan utama, riwayat penyakit, alergi obat..."
                    required
                  />
                </CardContent>
              </Card>

              {/* 2. Vital Signs */}
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    2. Pemeriksaan Fisik & Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Sistolik (mmHg)</label>
                      <Input
                        type="number"
                        value={systolic}
                        onChange={e => setSystolic(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Diastolik (mmHg)</label>
                      <Input
                        type="number"
                        value={diastolic}
                        onChange={e => setDiastolic(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Suhu Tubuh (°C)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={e => setTemperature(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Denyut Nadi (bpm)</label>
                      <Input
                        type="number"
                        value={heartRate}
                        onChange={e => setHeartRate(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Diagnosis ICD-10 */}
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    3. Diagnosis ICD-10 (Persyaratan Kemenkes)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      type="text"
                      value={icdSearch}
                      onChange={e => {
                        setIcdSearch(e.target.value);
                        searchIcd10(e.target.value);
                      }}
                      placeholder="Cari Kode atau Nama Penyakit ICD-10 (Contoh: J00, Diare, Hipertensi)..."
                      className="pl-9 bg-slate-950 border-slate-700 text-white text-xs focus:border-teal-500"
                    />
                  </div>

                  {icdSearch && (
                    <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl divide-y divide-slate-800">
                      {icdResults.map(icd => (
                        <button
                          key={icd.code}
                          type="button"
                          onClick={() => handleAddDiagnosis(icd)}
                          className="w-full p-2.5 text-left hover:bg-slate-800 transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-teal-400 font-mono mr-2">{icd.code}</strong>
                            <span className="text-slate-200">{icd.nameIndo}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 italic">{icd.nameEng}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Diagnosis Terpilih:
                    </label>
                    {selectedDiagnoses.map((d) => (
                      <div key={d.icd10Code} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-teal-500/20 text-teal-400 font-mono text-xs font-bold">
                            {d.icd10Code}
                          </Badge>
                          <span className="text-xs text-white font-medium">{d.nameIndo}</span>
                          {d.isPrimary && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                              UTAMA
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDiagnosis(d.icd10Code)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 4. Resep Obat & One-Click Bundles */}
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-amber-400" />
                    4. Resep Obat (KFA)
                  </CardTitle>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddPrescription}
                    className="text-teal-400 border border-teal-500/20 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Obat
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preset Bundles */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Preset Cepat Dokter:</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPresetBundle('ISPA')} className="text-[11px] text-teal-300 border-teal-500/30">
                      ⚡ Paket ISPA / Flu
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPresetBundle('GASTRITIS')} className="text-[11px] text-amber-300 border-amber-500/30">
                      ⚡ Paket Gastritis / Maag
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPresetBundle('HYPERTENSION')} className="text-[11px] text-rose-300 border-rose-500/30">
                      ⚡ Paket Hipertensi
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {prescriptions.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="sm:col-span-2">
                          <Input
                            type="text"
                            value={p.medicineName}
                            onChange={e => {
                              const newRx = [...prescriptions];
                              newRx[idx].medicineName = e.target.value;
                              setPrescriptions(newRx);
                            }}
                            placeholder="Nama Obat (Contoh: Paracetamol 500mg)"
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <Input
                            type="text"
                            value={p.frequency}
                            onChange={e => {
                              const newRx = [...prescriptions];
                              newRx[idx].frequency = e.target.value;
                              setPrescriptions(newRx);
                            }}
                            placeholder="Aturan Pakai (Contoh: 3x Sehari)"
                            className="bg-slate-900 border-slate-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={p.quantity}
                            onChange={e => {
                              const newRx = [...prescriptions];
                              newRx[idx].quantity = Number(e.target.value);
                              setPrescriptions(newRx);
                            }}
                            placeholder="Jumlah"
                            className="bg-slate-900 border-slate-700 text-white text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button
                id="btn-save-rme"
                type="submit"
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/20 transition-all"
              >
                <CheckCircle className="w-5 h-5 mr-2 stroke-[2.5]" />
                {saving ? 'Menyimpan & Mensinkronkan...' : 'Simpan Rekam Medis (RME) & Sinkronkan ke SATUSEHAT'}
              </Button>
            </form>
          ) : (
            <Card className="bg-slate-900/90 border-slate-800 p-12 text-center text-slate-400">
              Pilih antrean pasien di sebelah kiri untuk mulai menginput Rekam Medis.
            </Card>
          )}
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
