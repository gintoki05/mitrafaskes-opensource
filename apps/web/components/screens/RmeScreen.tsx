'use client';

import React, { useCallback, useState } from 'react';
import { Stethoscope, Zap } from 'lucide-react';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { apiFetch } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useRmeResources } from '@/hooks/useRmeResources';
import type { Icd10Entry } from '@/lib/clinical-types';
import { RmeEncounterQueue } from './rme/RmeEncounterQueue';
import { RmeForm, RmeFormPlaceholder } from './rme/RmeForm';
import type { RmeDiagnosis, RmePrescription, RmePrescriptionField, RmePresetBundle } from './rme/types';

export default function RmePage() {
  const [anamnesis, setAnamnesis] = useState('Pasien mengeluh demam dan batuk sejak 2 hari yang lalu.');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('78');
  const [temperature, setTemperature] = useState('37.2');
  const [icdSearch, setIcdSearch] = useState('');
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<RmeDiagnosis[]>([
    { icd10Code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', isPrimary: true },
  ]);
  const [prescriptions, setPrescriptions] = useState<RmePrescription[]>([
    { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
    { medicineName: 'Amoxicillin 500mg', dosage: '1 Kaplet', frequency: '3x Sehari sesudah makan', quantity: 15 },
  ]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const {
    encounters,
    selectedEncounter,
    encountersLoading,
    loadError,
    icdResults,
    refreshEncounters,
    searchIcd10,
    selectEncounter,
  } = useRmeResources();

  const handleSaveShortcut = useCallback((event: KeyboardEvent) => {
    if (!event.ctrlKey || event.key !== 'Enter') return;
    event.preventDefault();
    document.getElementById('btn-save-rme')?.click();
  }, []);

  useKeyboardShortcut('Enter', handleSaveShortcut);

  const handleAddDiagnosis = (icd: Icd10Entry) => {
    if (!selectedDiagnoses.some((diagnosis) => diagnosis.icd10Code === icd.code)) {
      setSelectedDiagnoses([
        ...selectedDiagnoses,
        { icd10Code: icd.code, nameIndo: icd.nameIndo, isPrimary: selectedDiagnoses.length === 0 },
      ]);
    }
    setIcdSearch('');
  };

  const handleRemoveDiagnosis = (code: string) => {
    setSelectedDiagnoses(selectedDiagnoses.filter((diagnosis) => diagnosis.icd10Code !== code));
  };

  const handleAddPrescription = () => {
    setPrescriptions([...prescriptions, { medicineName: '', dosage: '1 Tablet', frequency: '3x Sehari', quantity: 10 }]);
  };

  const handleVitalChange = (field: 'systolic' | 'diastolic' | 'temperature' | 'heartRate', value: string) => {
    const setters = { systolic: setSystolic, diastolic: setDiastolic, temperature: setTemperature, heartRate: setHeartRate };
    setters[field](value);
  };

  const handleUpdatePrescription = (index: number, field: RmePrescriptionField, value: string | number) => {
    setPrescriptions(prescriptions.map((prescription, itemIndex) => (
      itemIndex === index ? { ...prescription, [field]: value } : prescription
    )));
  };

  const applyPresetBundle = (type: RmePresetBundle) => {
    if (type === 'ISPA') {
      setSelectedDiagnoses([{ icd10Code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', isPrimary: true }]);
      setPrescriptions([
        { medicineName: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'CTM 4mg', dosage: '1 Tablet', frequency: '3x Sehari sesudah makan', quantity: 10 },
        { medicineName: 'Vitamin C 50mg', dosage: '1 Tablet', frequency: '2x Sehari sesudah makan', quantity: 10 },
      ]);
    } else if (type === 'GASTRITIS') {
      setSelectedDiagnoses([{ icd10Code: 'K29.7', nameIndo: 'Gastritis, Tidak Spesifik (Sakit Maag)', isPrimary: true }]);
      setPrescriptions([
        { medicineName: 'Antasida Doen', dosage: '1 Tablet Kunyah', frequency: '3x Sehari sebelum makan', quantity: 12 },
        { medicineName: 'Omeprazole 20mg', dosage: '1 Kapsul', frequency: '2x Sehari sebelum makan', quantity: 10 },
      ]);
    } else if (type === 'HYPERTENSION') {
      setSelectedDiagnoses([{ icd10Code: 'I10', nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)', isPrimary: true }]);
      setPrescriptions([{ medicineName: 'Amlodipine 5mg', dosage: '1 Tablet', frequency: '1x Sehari pagi hari', quantity: 30 }]);
    }
  };

  const handleSaveRme = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEncounter) return;

    setSaving(true);
    setSuccessMsg('');
    setSaveError('');

    try {
      const response = await apiFetch('/api/rme', {
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

      if (response.ok) {
        setSuccessMsg('Rekam Medis (RME) Berhasil Disimpan & Otomatis Ditransformasikan ke SATUSEHAT Kemenkes RI!');
        void refreshEncounters();
      } else {
        throw new Error('RME tidak dapat disimpan. Periksa data lalu coba lagi.');
      }
    } catch (error) {
      console.error(error);
      setSaveError(error instanceof Error ? error.message : 'RME tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.RME_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Stethoscope className="h-6 w-6" />}
          title="Form Rekam Medis Elektronik (RME) Dokter"
          description="Input anamnesis, vital signs, diagnosis ICD-10, dan e-resep obat pasien rawat jalan."
          action={
            <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-xs text-primary">
              <Zap className="h-4 w-4 text-warning" />
              <span>Shortcut: <strong>Ctrl + Enter</strong> untuk Simpan</span>
            </div>
          }
        />

        {successMsg && <ScreenState kind="success" title="RME berhasil disimpan" description={successMsg} compact />}
        {saveError ? <ScreenState kind="error" title="Penyimpanan gagal" description={saveError} compact /> : null}
        {loadError ? <ScreenState kind="error" title="Antrean tidak tersedia" description={loadError} compact /> : null}

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
          <RmeEncounterQueue
            encounters={encounters}
            selectedEncounter={selectedEncounter}
            encountersLoading={encountersLoading}
            loadError={loadError}
            onSelectEncounter={selectEncounter}
          />

          <div className="min-w-0 space-y-6 lg:col-span-3">
            {selectedEncounter ? (
              <RmeForm
                encounter={selectedEncounter}
                anamnesis={anamnesis}
                systolic={systolic}
                diastolic={diastolic}
                heartRate={heartRate}
                temperature={temperature}
                icdSearch={icdSearch}
                icdResults={icdResults}
                selectedDiagnoses={selectedDiagnoses}
                prescriptions={prescriptions}
                saving={saving}
                onSubmit={handleSaveRme}
                onAnamnesisChange={setAnamnesis}
                onVitalChange={handleVitalChange}
                onIcdSearchChange={(value) => {
                  setIcdSearch(value);
                  void searchIcd10(value);
                }}
                onAddDiagnosis={handleAddDiagnosis}
                onRemoveDiagnosis={handleRemoveDiagnosis}
                onAddPrescription={handleAddPrescription}
                onUpdatePrescription={handleUpdatePrescription}
                onApplyPresetBundle={applyPresetBundle}
              />
            ) : (
              <RmeFormPlaceholder encountersLoading={encountersLoading} />
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
