'use client';

import type { FormEventHandler } from 'react';
import { CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenState } from '@/components/ScreenState';
import type { Encounter, Icd10Entry } from '@/lib/clinical-types';
import { RmeDiagnosisSection } from './RmeDiagnosisSection';
import { RmePatientBanner } from './RmePatientBanner';
import { RmePrescriptionSection } from './RmePrescriptionSection';
import { RmeVitalSigns } from './RmeVitalSigns';
import type { RmeDiagnosis, RmePrescription, RmePrescriptionField, RmePresetBundle } from './types';

type RmeFormProps = {
  encounter: Encounter;
  anamnesis: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  temperature: string;
  icdSearch: string;
  icdResults: Icd10Entry[];
  selectedDiagnoses: RmeDiagnosis[];
  prescriptions: RmePrescription[];
  saving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onAnamnesisChange: (value: string) => void;
  onVitalChange: (field: 'systolic' | 'diastolic' | 'temperature' | 'heartRate', value: string) => void;
  onIcdSearchChange: (value: string) => void;
  onAddDiagnosis: (icd: Icd10Entry) => void;
  onRemoveDiagnosis: (code: string) => void;
  onAddPrescription: () => void;
  onUpdatePrescription: (index: number, field: RmePrescriptionField, value: string | number) => void;
  onApplyPresetBundle: (type: RmePresetBundle) => void;
};

export function RmeForm({
  encounter,
  anamnesis,
  systolic,
  diastolic,
  heartRate,
  temperature,
  icdSearch,
  icdResults,
  selectedDiagnoses,
  prescriptions,
  saving,
  onSubmit,
  onAnamnesisChange,
  onVitalChange,
  onIcdSearchChange,
  onAddDiagnosis,
  onRemoveDiagnosis,
  onAddPrescription,
  onUpdatePrescription,
  onApplyPresetBundle,
}: RmeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <RmePatientBanner encounter={encounter} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            1. Anamnesis & Keluhan Utama
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="anamnesis"
            aria-label="Anamnesis dan keluhan utama"
            rows={3}
            value={anamnesis}
            onChange={(event) => onAnamnesisChange(event.target.value)}
            className="clinical-field w-full p-3 text-xs"
            placeholder="Input keluhan utama, riwayat penyakit, alergi obat..."
            required
          />
        </CardContent>
      </Card>

      <RmeVitalSigns
        systolic={systolic}
        diastolic={diastolic}
        temperature={temperature}
        heartRate={heartRate}
        onChange={onVitalChange}
      />
      <RmeDiagnosisSection
        icdSearch={icdSearch}
        icdResults={icdResults}
        selectedDiagnoses={selectedDiagnoses}
        onSearchChange={onIcdSearchChange}
        onAddDiagnosis={onAddDiagnosis}
        onRemoveDiagnosis={onRemoveDiagnosis}
      />
      <RmePrescriptionSection
        prescriptions={prescriptions}
        onAddPrescription={onAddPrescription}
        onUpdatePrescription={onUpdatePrescription}
        onApplyPresetBundle={onApplyPresetBundle}
      />

      <Button
        id="btn-save-rme"
        type="submit"
        disabled={saving}
        className="w-full rounded-[var(--radius-panel)] bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/85"
      >
        <CheckCircle className="mr-2 h-5 w-5 stroke-[2.5]" />
        {saving ? 'Menyimpan & Mensinkronkan...' : 'Simpan Rekam Medis (RME) & Sinkronkan ke SATUSEHAT'}
      </Button>
    </form>
  );
}

export function RmeFormPlaceholder({ encountersLoading }: { encountersLoading: boolean }) {
  return (
    <ScreenState
      kind={encountersLoading ? 'loading' : 'empty'}
      title={encountersLoading ? 'Menyiapkan ruang kerja RME' : 'Belum ada pasien yang dipilih'}
      description={encountersLoading ? 'Antrean pasien sedang dimuat.' : 'Pilih antrean pasien untuk mulai mengisi rekam medis.'}
    />
  );
}

