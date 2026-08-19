'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useConditionActions } from './useConditionActions';
import { useObservationActions } from './useObservationActions';

function errorDescription(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Resource belum dapat disinkronkan ke SATUSEHAT.';
}

export function useRmeSatusehatActions(input: {
  reloadRecord: () => void;
  refreshSelectedEncounter: () => Promise<unknown>;
}) {
  const { reloadRecord, refreshSelectedEncounter } = input;
  const conditionActions = useConditionActions();
  const observationActions = useObservationActions();
  const [syncingDiagnosisId, setSyncingDiagnosisId] = useState<string | null>(
    null,
  );
  const [syncingObservationId, setSyncingObservationId] = useState<string | null>(
    null,
  );

  const syncDiagnosis = useCallback(
    async (diagnosisId: string) => {
      if (syncingDiagnosisId) return;
      setSyncingDiagnosisId(diagnosisId);
      try {
        await conditionActions.syncSatusehat(diagnosisId);
        reloadRecord();
        toast.success('Diagnosis tersinkron ke SATUSEHAT', {
          description: 'Linkage dan status sinkronisasi terbaru sudah dimuat ulang.',
        });
      } catch (error) {
        reloadRecord();
        toast.error('Diagnosis gagal disinkronkan', {
          description: errorDescription(error),
          duration: 9000,
        });
      } finally {
        setSyncingDiagnosisId(null);
      }
    }, [conditionActions, reloadRecord, syncingDiagnosisId],
  );

  const syncObservation = useCallback(
    async (observationId: string) => {
      if (syncingObservationId) return;
      setSyncingObservationId(observationId);
      try {
        await observationActions.syncSatusehat(observationId);
        reloadRecord();
        toast.success('Observation tersinkron ke SATUSEHAT', {
          description: 'Linkage dan status sinkronisasi terbaru sudah dimuat ulang.',
        });
      } catch (error) {
        reloadRecord();
        toast.error('Observation gagal disinkronkan', {
          description: errorDescription(error),
          duration: 9000,
        });
      } finally {
        setSyncingObservationId(null);
      }
    }, [observationActions, reloadRecord, syncingObservationId],
  );

  const settleEncounterSync = useCallback(async () => {
    const refreshed = await refreshSelectedEncounter();
    reloadRecord();
    if (!refreshed) {
      toast.warning('Status SATUSEHAT perlu dimuat ulang', {
        description:
          'Sinkronisasi sudah diproses, tetapi snapshot Encounter terbaru belum dapat dimuat. Muat ulang ruang kerja untuk melihat linkage terbaru.',
        duration: 8000,
      });
    }
  }, [refreshSelectedEncounter, reloadRecord]);

  return {
    syncingDiagnosisId,
    syncingObservationId,
    syncDiagnosis,
    syncObservation,
    settleEncounterSync,
  };
}
