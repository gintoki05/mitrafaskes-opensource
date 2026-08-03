'use client';

import { useCallback, useState } from 'react';
import { Stethoscope, Zap } from 'lucide-react';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { apiFetch } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useRmeResources } from '@/hooks/useRmeResources';
import { RmeEncounterQueue } from './rme/RmeEncounterQueue';
import { RmeForm, RmeFormPlaceholder } from './rme/RmeForm';
import type { RmeFormValues } from './rme/rme-form-schema';

export default function RmePage() {
  const [icdSearch, setIcdSearch] = useState('');
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

  const handleSaveRme = async (values: RmeFormValues) => {
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
          ...values,
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
                key={selectedEncounter.id}
                encounter={selectedEncounter}
                icdSearch={icdSearch}
                icdResults={icdResults}
                saving={saving}
                onSubmit={handleSaveRme}
                onIcdSearchChange={(value) => {
                  setIcdSearch(value);
                  void searchIcd10(value);
                }}
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
