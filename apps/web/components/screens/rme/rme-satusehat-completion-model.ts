import {
  EncounterStatus,
  MedicalRecordStatus,
  type Encounter,
  type MedicalRecord,
  type ResourceIntegrationSummary,
} from '@mitrafaskes/shared';

export type RmeSatusehatStepState =
  | 'complete'
  | 'ready'
  | 'blocked'
  | 'empty';

export type RmeSatusehatCompletionModel = {
  encounterConnected: boolean;
  encounterRecoveryAvailable: boolean;
  encounterFinishedRemotely: boolean;
  primaryDiagnosisConnected: boolean;
  linkedObservationCount: number;
  totalObservationCount: number;
  completedStepCount: number;
  initialEncounter: {
    state: RmeSatusehatStepState;
    disabledReason?: string;
  };
  diagnosis: {
    state: RmeSatusehatStepState;
    disabledReason?: string;
  };
  observation: {
    state: RmeSatusehatStepState;
    disabledReason?: string;
  };
  finalEncounter: {
    state: RmeSatusehatStepState;
    disabledReason?: string;
  };
};

function satusehatSummary(
  integrations: readonly ResourceIntegrationSummary[] | undefined,
) {
  return integrations?.find(
    (integration) => integration.provider.toUpperCase() === 'SATUSEHAT',
  );
}

function isConnected(
  integrations: readonly ResourceIntegrationSummary[] | undefined,
): boolean {
  return Boolean(satusehatSummary(integrations)?.linkage);
}

export function resolveRmeSatusehatCompletion(input: {
  encounter: Encounter;
  record: MedicalRecord | null;
  canSync: boolean;
  localChangesPending?: boolean;
}): RmeSatusehatCompletionModel {
  const { encounter, record, canSync, localChangesPending = false } = input;
  const encounterIntegration = satusehatSummary(encounter.integrations);
  const encounterConnected = Boolean(encounterIntegration?.linkage);
  const encounterFinishedRemotely =
    encounterIntegration?.linkage?.remoteStatus === 'finished';
  const primaryDiagnosis = record?.diagnoses.find(
    (diagnosis) => diagnosis.isPrimary,
  );
  const primaryDiagnosisConnected = isConnected(primaryDiagnosis?.integrations);
  const observations = record?.observations ?? [];
  const linkedObservationCount = observations.filter((observation) =>
    isConnected(observation.integrations),
  ).length;
  const allObservationsConnected =
    observations.length > 0 && linkedObservationCount === observations.length;
  const recordFinal = record?.status === MedicalRecordStatus.FINAL;
  const encounterRecoveryAvailable =
    recordFinal &&
    encounter.status === EncounterStatus.COMPLETED &&
    !encounterConnected &&
    Boolean(primaryDiagnosis);
  const encounterActive =
    encounter.status === EncounterStatus.WAITING ||
    encounter.status === EncounterStatus.IN_PROGRESS;
  const pendingReason = localChangesPending
    ? 'Simpan perubahan lokal sebelum sinkronisasi.'
    : undefined;
  const permissionReason = !canSync
    ? 'Peran Anda tidak memiliki izin sinkronisasi SATUSEHAT.'
    : undefined;

  const initialEncounter = encounterConnected
    ? {
        state: 'complete' as const,
        disabledReason: encounterActive
          ? pendingReason ?? permissionReason
          : 'Encounter awal sudah terhubung dan lifecycle lokal telah selesai.',
      }
    : encounterActive && !pendingReason && !permissionReason
      ? { state: 'ready' as const }
      : {
          state: 'blocked' as const,
          disabledReason:
            pendingReason ??
            permissionReason ??
            (encounterRecoveryAvailable
              ? 'Encounter awal terlewat; sinkronisasi diagnosis utama akan memulihkan linkage historis.'
              : 'Encounter awal tidak dapat dibuat setelah lifecycle lokal selesai.'),
        };

  const diagnosis = primaryDiagnosisConnected
    ? { state: 'complete' as const, disabledReason: pendingReason ?? permissionReason }
    : !primaryDiagnosis
      ? {
          state: 'empty' as const,
          disabledReason: 'Simpan diagnosis utama ICD-10 terlebih dahulu.',
        }
      : !encounterConnected && !encounterRecoveryAvailable
        ? {
            state: 'blocked' as const,
            disabledReason: 'Sinkronkan Encounter awal sebelum Condition.',
          }
        : pendingReason || permissionReason
          ? {
              state: 'blocked' as const,
              disabledReason: pendingReason ?? permissionReason,
            }
          : { state: 'ready' as const };

  const observation =
    allObservationsConnected
      ? { state: 'complete' as const, disabledReason: pendingReason ?? permissionReason }
      : observations.length === 0
        ? {
            state: 'empty' as const,
            disabledReason: 'Simpan draft dengan tanda vital terlebih dahulu.',
          }
        : !encounterConnected
          ? {
              state: 'blocked' as const,
              disabledReason: 'Sinkronkan Encounter awal sebelum Observation.',
            }
          : pendingReason || permissionReason
            ? {
                state: 'blocked' as const,
                disabledReason: pendingReason ?? permissionReason,
              }
            : { state: 'ready' as const };

  const finalEncounter = encounterFinishedRemotely
    ? {
        state: 'complete' as const,
        disabledReason: pendingReason ?? permissionReason,
      }
    : !recordFinal
      ? {
          state: 'blocked' as const,
          disabledReason: 'Finalisasi RME lokal sebelum memperbarui Encounter menjadi finished.',
        }
      : !primaryDiagnosisConnected
          ? {
              state: 'blocked' as const,
              disabledReason: encounterRecoveryAvailable
                ? 'Sinkronkan diagnosis utama untuk memulihkan Encounter, membuat Condition, dan memproyeksikan status finished.'
                : 'Sinkronkan diagnosis utama Condition terlebih dahulu.',
            }
        : !encounterConnected
          ? {
              state: 'blocked' as const,
              disabledReason: 'Encounter awal belum terhubung ke SATUSEHAT.',
            }
          : pendingReason || permissionReason
            ? {
                state: 'blocked' as const,
                disabledReason: pendingReason ?? permissionReason,
              }
            : { state: 'ready' as const };

  return {
    encounterConnected,
    encounterRecoveryAvailable,
    encounterFinishedRemotely,
    primaryDiagnosisConnected,
    linkedObservationCount,
    totalObservationCount: observations.length,
    completedStepCount: [
      encounterConnected,
      primaryDiagnosisConnected,
      allObservationsConnected,
      encounterFinishedRemotely,
    ].filter(Boolean).length,
    initialEncounter,
    diagnosis,
    observation,
    finalEncounter,
  };
}
