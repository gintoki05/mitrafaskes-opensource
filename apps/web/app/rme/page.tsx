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
      <div className="clinical-panel flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Stethoscope className="h-6 w-6 text-success" />
            Form Rekam Medis Elektronik (RME) Dokter
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Input Anamnesis, Vital Signs, Diagnosis ICD-10, dan E-Resep Obat Pasien Rawat Jalan
          </p>
        </div>

        {/* Quick Shortcut Badge */}
        <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary">
          <Zap className="h-4 w-4 text-warning" />
          <span>Shortcut: <strong>Ctrl + Enter</strong> untuk Simpan</span>
        </div>
      </div>

      {successMsg && (
        <div className="clinical-status-success flex items-center gap-3 rounded-[var(--radius-card)] border p-4 text-xs font-semibold" role="status" aria-live="polite">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Select Patient Queue */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Antrean Pasien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {encounters.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEncounter(e)}
                  aria-pressed={selectedEncounter?.id === e.id}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-card)] border p-3 text-left transition-colors ${
                    selectedEncounter?.id === e.id
                      ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-foreground">{e.patient?.fullName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{e.patient?.medicalRecNo}</div>
                  </div>
                  <Badge className="bg-muted font-mono text-xs font-bold text-primary">
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
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-primary/20 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-primary/30 bg-primary/10 text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{selectedEncounter.patient?.fullName}</div>
                    <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                      <span>No. RM: {selectedEncounter.patient?.medicalRecNo}</span>
                      <span>NIK: {selectedEncounter.patient?.nik}</span>
                    </div>
                  </div>
                </div>
                <Badge className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                  Rawat Jalan - Poli Umum
                </Badge>
              </div>

              {/* 1. Anamnesis */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    1. Anamnesis & Keluhan Utama
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    rows={3}
                    value={anamnesis}
                    onChange={e => setAnamnesis(e.target.value)}
                    className="clinical-field w-full p-3 text-xs"
                    placeholder="Input keluhan utama, riwayat penyakit, alergi obat..."
                    required
                  />
                </CardContent>
              </Card>

              {/* 2. Vital Signs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Activity className="h-4 w-4 text-success" />
                    2. Pemeriksaan Fisik & Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Sistolik (mmHg)</label>
                      <Input
                        type="number"
                        value={systolic}
                        onChange={e => setSystolic(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Diastolik (mmHg)</label>
                      <Input
                        type="number"
                        value={diastolic}
                        onChange={e => setDiastolic(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Suhu Tubuh (°C)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={e => setTemperature(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Denyut Nadi (bpm)</label>
                      <Input
                        type="number"
                        value={heartRate}
                        onChange={e => setHeartRate(e.target.value)}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Diagnosis ICD-10 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Heart className="h-4 w-4 text-destructive" />
                    3. Diagnosis ICD-10 (Persyaratan Kemenkes)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={icdSearch}
                      onChange={e => {
                        setIcdSearch(e.target.value);
                        searchIcd10(e.target.value);
                      }}
                      placeholder="Cari Kode atau Nama Penyakit ICD-10 (Contoh: J00, Diare, Hipertensi)..."
                      className="pl-9 text-xs"
                    />
                  </div>

                  {icdSearch && (
                    <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-[var(--radius-card)] border border-input bg-background">
                      {icdResults.map(icd => (
                        <button
                          key={icd.code}
                          type="button"
                          onClick={() => handleAddDiagnosis(icd)}
                          className="flex w-full items-center justify-between p-2.5 text-left text-xs transition-colors hover:bg-muted"
                        >
                          <div>
                            <strong className="mr-2 font-mono text-primary">{icd.code}</strong>
                            <span className="text-foreground">{icd.nameIndo}</span>
                          </div>
                          <span className="text-[10px] italic text-muted-foreground">{icd.nameEng}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Diagnosis Terpilih:
                    </label>
                    {selectedDiagnoses.map((d) => (
                      <div key={d.icd10Code} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/10 font-mono text-xs font-bold text-primary">
                            {d.icd10Code}
                          </Badge>
                          <span className="text-xs font-medium text-foreground">{d.nameIndo}</span>
                          {d.isPrimary && (
                            <Badge className="clinical-status-success border text-[10px] font-bold">
                              UTAMA
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDiagnosis(d.icd10Code)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 4. Resep Obat & One-Click Bundles */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Thermometer className="h-4 w-4 text-warning" />
                    4. Resep Obat (KFA)
                  </CardTitle>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddPrescription}
                    className="border-primary/20 text-xs font-semibold text-primary"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Obat
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preset Bundles */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">Preset Cepat Dokter:</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPresetBundle('ISPA')} className="border-primary/30 text-[11px] text-primary">
                      ⚡ Paket ISPA / Flu
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPresetBundle('GASTRITIS')} className="border-warning/30 text-[11px] text-warning">
                      ⚡ Paket Gastritis / Maag
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPresetBundle('HYPERTENSION')} className="border-destructive/30 text-[11px] text-destructive">
                      ⚡ Paket Hipertensi
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {prescriptions.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-1 gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3 sm:grid-cols-4">
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
                            className="text-xs"
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
                            className="text-xs"
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
                            className="text-xs font-mono"
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
                className="w-full rounded-[var(--radius-panel)] bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/85"
              >
                <CheckCircle className="w-5 h-5 mr-2 stroke-[2.5]" />
                {saving ? 'Menyimpan & Mensinkronkan...' : 'Simpan Rekam Medis (RME) & Sinkronkan ke SATUSEHAT'}
              </Button>
            </form>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              Pilih antrean pasien di sebelah kiri untuk mulai menginput Rekam Medis.
            </Card>
          )}
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
