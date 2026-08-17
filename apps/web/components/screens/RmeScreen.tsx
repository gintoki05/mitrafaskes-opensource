'use client';

import { useCallback, useState } from 'react';
import { RefreshCw, Stethoscope, Zap } from 'lucide-react';
import { AccessPermission } from '@mitrafaskes/shared';
import { EncounterStatus } from '@mitrafaskes/shared';
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
import { RmeBackToTop } from './rme/RmeBackToTop';
import { RmeForm, RmeFormPlaceholder } from './rme/RmeForm';
import { RmeWorkspaceContext } from './rme/RmeWorkspaceContext';
import { resolveRmeWorkspaceViewState } from './rme/rme-workspace-model';
import type { RmeFormValues } from './rme/rme-form-schema';
import { useConditionActions } from './rme/useConditionActions';
import { useObservationActions } from './rme/useObservationActions';
import { useEncounterActions } from '@/hooks/useEncounterActions';

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
  const [syncingObservationId, setSyncingObservationId] = useState<string | null>(
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
  const observationActions = useObservationActions();
  const encounterActions = useEncounterActions();
  const [startingEncounterId, setStartingEncounterId] = useState<string | null>(null);
  const [transitioningEncounterId, setTransitioningEncounterId] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const canSyncDiagnosis = can(
    session?.user ?? null,
    AccessPermission.SYNC_RETRY,
  );
  const canSyncObservation = can(
    session?.user ?? null,
    AccessPermission.SYNC_RETRY,
  );
  const canStartEncounter = can(
    session?.user ?? null,
    AccessPermission.QUEUE_START,
  );
  const canPauseEncounter = can(
    session?.user ?? null,
    AccessPermission.QUEUE_PAUSE,
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

  const handleSyncObservation = async (observationId: string) => {
    if (syncingObservationId) return;
    setSyncingObservationId(observationId);
    try {
      await observationActions.syncSatusehat(observationId);
      lifecycle.reload();
      toast.success('Observation tersinkron ke SATUSEHAT', {
        description:
          'Linkage dan status sinkronisasi terbaru sudah dimuat ulang.',
      });
    } catch (error) {
      lifecycle.reload();
      toast.error('Observation gagal disinkronkan', {
        description: errorDescription(error),
        duration: 9000,
      });
    } finally {
      setSyncingObservationId(null);
    }
  };

  const handleStartEncounter = async (encounter: (typeof encounters)[number]) => {
    if (startingEncounterId) return;
    setStartingEncounterId(encounter.id);
    try {
      await encounterActions.updateStatus(
        encounter.id,
        EncounterStatus.IN_PROGRESS,
        encounter.version,
      );
      await refreshEncounters(encountersMeta.page, { retainMissingSelection: true });
      if (encounter.triage?.status !== 'COMPLETED') {
        toast.warning('Pemeriksaan dimulai dengan triase belum selesai', {
          description: 'Pasien tetap akan muncul di antrean triase perawat agar data awal dapat dilengkapi.',
        });
      } else {
        toast.success('Pemeriksaan dimulai');
      }
    } catch (error) {
      toast.error('Pemeriksaan belum dapat dimulai', {
        description: error instanceof Error ? error.message : 'Status Encounter tidak dapat diperbarui.',
      });
    } finally {
      setStartingEncounterId(null);
    }
  };

  const handleResumeEncounter = async (encounter: (typeof encounters)[number]) => {
    if (transitioningEncounterId) return;
    setTransitioningEncounterId(encounter.id);
    try {
      await encounterActions.updateStatus(
        encounter.id,
        EncounterStatus.IN_PROGRESS,
        encounter.version,
      );
      await refreshEncounters(encountersMeta.page, { retainMissingSelection: true });
      toast.success('Pemeriksaan dilanjutkan', {
        description: 'Encounter kembali ke status in-progress dan RME dapat diisi.',
      });
    } catch (error) {
      toast.error('Pemeriksaan belum dapat dilanjutkan', {
        description: error instanceof Error ? error.message : 'Status Encounter tidak dapat diperbarui.',
      });
    } finally {
      setTransitioningEncounterId(null);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.RME_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Stethoscope className="h-6 w-6" />}
          title="Form Rekam Medis Elektronik (RME) Dokter"
          description={
            session?.user.organization
              ? `Faskes aktif: ${session.user.organization.code} · ${session.user.organization.name}. Simpan asesmen bertahap sebagai draft, lalu finalisasi untuk menyelesaikan Encounter.`
              : 'Simpan asesmen bertahap sebagai draft, lalu finalisasi untuk menyelesaikan Encounter. Akun dokter perlu ditugaskan ke satu Organization.'
          }
          action={
            <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-xs text-primary">
              <Zap className="h-4 w-4 text-warning" />
              <span>Shortcut: <strong>Ctrl + Enter</strong> untuk simpan draft</span>
            </div>
          }
        />

        <div
          className={
            queueOpen
              ? 'grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-8'
              : 'grid min-w-0 grid-cols-1 gap-6'
          }
        >
          <RmeEncounterQueue
            encounters={encounters}
            meta={encountersMeta}
            selectedEncounter={selectedEncounter}
            isOpen={queueOpen}
            encountersLoading={encountersLoading}
            loadError={loadError}
            onSelectEncounter={selectEncounter}
            onOpenChange={setQueueOpen}
            onPageChange={(page) => void refreshEncounters(page)}
            onRetry={() => void refreshEncounters(encountersMeta.page)}
            canStart={canStartEncounter}
            startingEncounterId={startingEncounterId}
            onStartEncounter={(encounter) => void handleStartEncounter(encounter)}
            canPause={canPauseEncounter}
            transitioningEncounterId={transitioningEncounterId}
            onResumeEncounter={(encounter) => void handleResumeEncounter(encounter)}
          />

          <div className="min-w-0 space-y-6">
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
            ) : workspaceState === 'ready' && selectedEncounter && selectedEncounter.status === EncounterStatus.ARRIVED ? (
              <ScreenState
                kind="empty"
                title="Pasien menunggu pemeriksaan"
                description="Mulai pemeriksaan untuk membuka dan mengisi RME dokter. Jika triase belum selesai, perawat tetap dapat melanjutkannya dari antrean triase."
                action={canStartEncounter ? <Button type="button" onClick={() => void handleStartEncounter(selectedEncounter)} disabled={Boolean(startingEncounterId)}>Mulai pemeriksaan</Button> : undefined}
              />
            ) : workspaceState === 'ready' && selectedEncounter && selectedEncounter.status === EncounterStatus.ONLEAVE ? (
              <ScreenState
                kind="empty"
                title="Pemeriksaan ditunda sementara"
                description="RME dalam status read-only sampai pemeriksaan dilanjutkan. Lanjutkan saat pasien atau dokter siap kembali ke layanan."
                action={canPauseEncounter ? <Button type="button" onClick={() => void handleResumeEncounter(selectedEncounter)} disabled={Boolean(transitioningEncounterId)}>Lanjutkan pemeriksaan</Button> : undefined}
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
                canSyncObservation={canSyncObservation}
                syncingObservationId={syncingObservationId}
                onSyncObservation={(observationId) =>
                  void handleSyncObservation(observationId)
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
      <RmeBackToTop />
    </RouteGuard>
  );
}
