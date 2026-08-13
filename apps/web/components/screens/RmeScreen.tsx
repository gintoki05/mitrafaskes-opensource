'use client';

import { useCallback, useState } from 'react';
import { RefreshCw, Stethoscope, Zap } from 'lucide-react';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useRmeLifecycle, RmeApiError } from '@/hooks/useRmeLifecycle';
import { useRmeResources } from '@/hooks/useRmeResources';
import { useSession } from '@/hooks/useSession';
import { can } from '@/lib/auth';
import { toast } from 'sonner';
import { RmeEncounterQueue } from './rme/RmeEncounterQueue';
import { RmeForm, RmeFormPlaceholder } from './rme/RmeForm';
import { RmeWorkspaceContext } from './rme/RmeWorkspaceContext';
import { resolveRmeWorkspaceViewState } from './rme/rme-workspace-model';
import type { RmeFormValues } from './rme/rme-form-schema';
import { useConditionActions } from './rme/useConditionActions';

function errorDescription(error: unknown): string {
  if (error instanceof RmeApiError && error.issues.length > 0) {
    return error.issues.map((issue) => issue.message).join(' ');
  }
  return error instanceof Error ? error.message : 'RME tidak dapat diproses.';
}

export default function RmePage() {
  const [icdSearch, setIcdSearch] = useState('');
  const [syncingDiagnosisId, setSyncingDiagnosisId] = useState<string | null>(
    null,
  );
  const session = useSession();
  const {
    encounters,
    encountersMeta,
    selectedEncounter,
    encountersLoading,
    loadError,
    icdResults,
    refreshEncounters,
    searchIcd10,
    selectEncounter,
  } = useRmeResources();
  const lifecycle = useRmeLifecycle(selectedEncounter?.id ?? null);
  const conditionActions = useConditionActions();
  const canSyncDiagnosis = can(
    session?.user ?? null,
    AccessPermission.SYNC_RETRY,
  );
  const workspaceState = resolveRmeWorkspaceViewState({
    encountersLoading,
    queueError: loadError,
    hasSelectedEncounter: Boolean(selectedEncounter),
    recordLoading: lifecycle.loading,
    recordError: lifecycle.loadError,
  });

  const handleSaveShortcut = useCallback((event: KeyboardEvent) => {
    if (!event.ctrlKey || event.key !== 'Enter') return;
    event.preventDefault();
    document.getElementById('btn-save-rme-draft')?.click();
  }, []);

  useKeyboardShortcut('Enter', handleSaveShortcut);

  const handleSaveDraft = async (values: RmeFormValues) => {
    try {
      await lifecycle.saveDraft(values);
      toast.success('Draft RME tersimpan', {
        description: 'Encounter tetap dalam pemeriksaan dan dapat dilanjutkan.',
      });
    } catch (error) {
      toast.error('Draft RME gagal disimpan', {
        description: errorDescription(error),
        duration: 7000,
      });
    }
  };

  const handleFinalize = async () => {
    try {
      await lifecycle.finalize();
      await refreshEncounters(encountersMeta.page, {
        retainMissingSelection: true,
      });
      toast.success('RME berhasil difinalisasi', {
        description: 'Catatan menjadi read-only dan Encounter telah diselesaikan.',
      });
    } catch (error) {
      toast.error('Finalisasi RME gagal', {
        description: errorDescription(error),
        duration: 9000,
      });
    }
  };

  const handlePreflight = async (): Promise<boolean> => {
    try {
      const result = await lifecycle.preflight();
      if (!result?.ready) {
        toast.error('RME belum siap difinalisasi', {
          description: 'Periksa issue pada setiap bagian formulir.',
          duration: 9000,
        });
        return false;
      }
      return true;
    } catch (error) {
      toast.error('Preflight finalisasi gagal', {
        description: errorDescription(error),
        duration: 9000,
      });
      return false;
    }
  };

  const handleSyncDiagnosis = async (diagnosisId: string) => {
    if (syncingDiagnosisId) return;
    setSyncingDiagnosisId(diagnosisId);
    try {
      await conditionActions.syncSatusehat(diagnosisId);
      lifecycle.reload();
      toast.success('Diagnosis tersinkron ke SATUSEHAT', {
        description:
          'Linkage dan status sinkronisasi terbaru sudah dimuat ulang.',
      });
    } catch (error) {
      lifecycle.reload();
      toast.error('Diagnosis gagal disinkronkan', {
        description: errorDescription(error),
        duration: 9000,
      });
    } finally {
      setSyncingDiagnosisId(null);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.RME_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Stethoscope className="h-6 w-6" />}
          title="Form Rekam Medis Elektronik (RME) Dokter"
          description="Simpan asesmen bertahap sebagai draft, lalu finalisasi untuk menyelesaikan Encounter."
          action={
            <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-xs text-primary">
              <Zap className="h-4 w-4 text-warning" />
              <span>Shortcut: <strong>Ctrl + Enter</strong> untuk simpan draft</span>
            </div>
          }
        />

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
          <RmeEncounterQueue
            encounters={encounters}
            meta={encountersMeta}
            selectedEncounter={selectedEncounter}
            encountersLoading={encountersLoading}
            loadError={loadError}
            onSelectEncounter={selectEncounter}
            onPageChange={(page) => void refreshEncounters(page)}
            onRetry={() => void refreshEncounters(encountersMeta.page)}
          />

          <div className="min-w-0 space-y-6 lg:col-span-3">
            {selectedEncounter ? (
              <RmeWorkspaceContext
                encounter={selectedEncounter}
                record={lifecycle.record}
              />
            ) : null}

            {workspaceState === 'loading-record' ? (
              <ScreenState kind="loading" title="Memuat draft RME" description="Mengambil versi catatan terbaru." />
            ) : workspaceState === 'record-error' ? (
              <ScreenState
                kind="error"
                title="RME tidak tersedia"
                description={lifecycle.loadError}
                action={
                  <Button type="button" size="sm" onClick={lifecycle.reload}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Muat ulang RME
                  </Button>
                }
              />
            ) : workspaceState === 'ready' && selectedEncounter ? (
              <RmeForm
                key={selectedEncounter.id}
                record={lifecycle.record}
                mutationState={lifecycle.mutationState}
                conflict={lifecycle.conflict}
                finalizationIssues={lifecycle.finalizationIssues}
                canSaveDraft={can(
                  session?.user ?? null,
                  AccessPermission.RME_WRITE_DRAFT,
                )}
                canFinalize={can(
                  session?.user ?? null,
                  AccessPermission.RME_FINALIZE,
                )}
                icdSearch={icdSearch}
                icdResults={icdResults}
                onSaveDraft={handleSaveDraft}
                onPreflight={handlePreflight}
                onFinalize={handleFinalize}
                onReload={lifecycle.reload}
                canSyncDiagnosis={canSyncDiagnosis}
                syncingDiagnosisId={syncingDiagnosisId}
                onSyncDiagnosis={(diagnosisId) =>
                  void handleSyncDiagnosis(diagnosisId)
                }
                onIcdSearchChange={(value) => {
                  setIcdSearch(value);
                  void searchIcd10(value);
                }}
              />
            ) : (
              <RmeFormPlaceholder
                encountersLoading={workspaceState === 'loading-queue'}
                loadError={workspaceState === 'queue-error' ? loadError : ''}
                onRetry={() => void refreshEncounters(encountersMeta.page)}
              />
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
