'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  HeartPulse,
  Stethoscope,
} from 'lucide-react';
import {
  MedicalRecordStatus,
  type ClinicalObservation,
  type Encounter,
  type MedicalRecord,
  type ResourceIntegrationSummary,
} from '@mitrafaskes/shared';
import { EncounterSyncDialog } from '@/components/screens/encounters/EncounterSyncDialog';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { Progress } from '@/components/ui/progress';
import { useEncounterActions } from '@/hooks/useEncounterActions';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import {
  getIntegrationLinkage,
  getLatestIntegrationSync,
} from '@/lib/integrations';
import { resolveRmeSatusehatCompletion } from './rme-satusehat-completion-model';
import {
  RmeSatusehatCompletionStep,
  RmeSatusehatResourceRow,
} from './RmeSatusehatCompletionStep';

type RmeSatusehatCompletionPanelProps = {
  encounter: Encounter;
  record: MedicalRecord | null;
  canSync: boolean;
  localChangesPending: boolean;
  localChangesReason?: string;
  syncingDiagnosisId: string | null;
  syncingObservationId: string | null;
  onSyncDiagnosis: (id: string) => void;
  onSyncObservation: (id: string) => void;
  onEncounterSettled: () => Promise<void>;
};

export function RmeSatusehatCompletionPanel({
  encounter,
  record,
  canSync,
  localChangesPending,
  localChangesReason,
  syncingDiagnosisId,
  syncingObservationId,
  onSyncDiagnosis,
  onSyncObservation,
  onEncounterSettled,
}: RmeSatusehatCompletionPanelProps) {
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const encounterActions = useEncounterActions();
  const [encounterDialogOpen, setEncounterDialogOpen] = useState(false);

  if (!satusehat.available) return null;

  const model = resolveRmeSatusehatCompletion({
    encounter,
    record,
    canSync,
    localChangesPending,
  });
  const encounterIntegration = satusehatSummary(encounter.integrations);
  const diagnoses = record?.diagnoses ?? [];
  const observations = record?.observations ?? [];
  const primaryDiagnosis = diagnoses.find((diagnosis) => diagnosis.isPrimary);
  const progressLabel = `${model.completedStepCount} dari 4 langkah selesai`;
  const sharedSyncReason =
    localChangesReason ?? 'Simpan perubahan lokal sebelum sinkronisasi.';

  return (
    <>
      <section
        aria-labelledby="rme-satusehat-completion-title"
        className="data-surface overflow-hidden"
      >
        <div className="grid gap-4 border-b border-border bg-primary/[0.04] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2
                  id="rme-satusehat-completion-title"
                  className="text-sm font-bold text-foreground"
                >
                  Penyelesaian SATUSEHAT
                </h2>
                <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                  Sinkronkan Encounter dan Condition sesuai dependency, pantau
                  Observation per item, lalu perbarui Encounter yang sama menjadi
                  finished.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-foreground">Progress integrasi</span>
              <span className="text-muted-foreground">{progressLabel}</span>
            </div>
            <Progress
              value={model.completedStepCount * 25}
              aria-label={progressLabel}
            />
          </div>
        </div>

        {localChangesPending || !canSync ? (
          <div
            role="status"
            className="border-b border-border bg-warning/10 px-4 py-3 text-xs font-medium text-warning-foreground sm:px-5"
          >
            Sinkronisasi dijeda:{' '}
            {localChangesPending
              ? sharedSyncReason
              : 'Peran Anda tidak memiliki izin sinkronisasi SATUSEHAT.'}
          </div>
        ) : null}

        <div className="divide-y divide-border">
          <RmeSatusehatCompletionStep
            icon={<Stethoscope className="h-4 w-4" />}
            title="Encounter awal"
            description="Kirim lifecycle lokal sebagai arrived atau in-progress. Repeat-sync memperbarui remote ID yang sama."
            state={model.initialEncounter.state}
            blocker={model.initialEncounter.disabledReason}
            linkage={getIntegrationLinkage(encounter.integrations, 'SATUSEHAT')}
            latestSync={getLatestIntegrationSync(encounter.integrations, 'SATUSEHAT')}
            resourceName={encounter.encounterNumber}
            action={
              record?.status !== MedicalRecordStatus.FINAL ? (
                <SatusehatActionGroup
                  resourceName={encounter.encounterNumber}
                  onSync={() => setEncounterDialogOpen(true)}
                  syncDisabled={
                    localChangesPending ||
                    !canSync ||
                    model.initialEncounter.state === 'blocked'
                  }
                  syncDisabledReason={
                    localChangesPending
                      ? sharedSyncReason
                      : model.initialEncounter.disabledReason
                  }
                  showLabels
                />
              ) : undefined
            }
          />

          <RmeSatusehatCompletionStep
            icon={<HeartPulse className="h-4 w-4" />}
            title="Diagnosis Condition"
            description="Diagnosis utama wajib terhubung sebelum Encounter finished. Bila sinkronisasi awal terlewat dan RME sudah FINAL, aksi diagnosis utama memulihkan Encounter historis terlebih dahulu."
            state={model.diagnosis.state}
            blocker={model.diagnosis.disabledReason}
            resourceName={primaryDiagnosis?.icd10Code ?? 'Diagnosis utama'}
          >
            {diagnoses.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {diagnoses.map((diagnosis) => {
                  const latestSync = getLatestIntegrationSync(
                    diagnosis.integrations,
                    'SATUSEHAT',
                  );
                  const syncing = syncingDiagnosisId === diagnosis.id;
                  const canRecoverEncounter =
                    diagnosis.isPrimary && model.encounterRecoveryAvailable;
                  const disabledReason = localChangesPending
                    ? sharedSyncReason
                    : !model.encounterConnected && !canRecoverEncounter
                      ? 'Sinkronkan Encounter awal sebelum Condition.'
                      : !canSync
                        ? 'Peran Anda tidak memiliki izin sinkronisasi SATUSEHAT.'
                        : syncing
                          ? 'Sinkronisasi diagnosis sedang berjalan.'
                          : undefined;
                  return (
                    <RmeSatusehatResourceRow
                      key={diagnosis.id}
                      title={diagnosis.icd10Code}
                      detail={diagnosis.icd10?.nameIndo ?? diagnosis.icd10?.display ?? 'Diagnosis ICD-10'}
                      primary={diagnosis.isPrimary}
                      integration={satusehatSummary(diagnosis.integrations)}
                      action={
                        <SatusehatActionGroup
                          resourceName={diagnosis.icd10Code}
                          onSync={() => onSyncDiagnosis(diagnosis.id)}
                          syncDisabled={Boolean(disabledReason)}
                          syncDisabledReason={disabledReason}
                          syncing={syncing}
                          showLabels
                        />
                      }
                      latestFailure={latestSync?.status === 'FAILED' ? latestSync.errorMessage : undefined}
                    />
                  );
                })}
              </div>
            ) : null}
          </RmeSatusehatCompletionStep>

          <RmeSatusehatCompletionStep
            icon={<Activity className="h-4 w-4" />}
            title="Observation tanda vital"
            description={`Kirim tiap Observation dengan code, nilai, UCUM, performer, linkage, dan error yang dapat ditindaklanjuti. ${model.linkedObservationCount}/${model.totalObservationCount} item terhubung.`}
            state={model.observation.state}
            blocker={model.observation.disabledReason}
            resourceName="Observation tanda vital"
          >
            {observations.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {observations.map((observation) => {
                  const latestSync = getLatestIntegrationSync(
                    observation.integrations,
                    'SATUSEHAT',
                  );
                  const syncing = syncingObservationId === observation.id;
                  const disabledReason = localChangesPending
                    ? sharedSyncReason
                    : !model.encounterConnected
                      ? 'Sinkronkan Encounter awal sebelum Observation.'
                      : !canSync
                        ? 'Peran Anda tidak memiliki izin sinkronisasi SATUSEHAT.'
                        : syncing
                          ? 'Sinkronisasi Observation sedang berjalan.'
                          : undefined;
                  return (
                    <RmeSatusehatResourceRow
                      key={observation.id}
                      title={observation.code.code}
                      detail={observationDetail(observation)}
                      metadata={`Performer: ${observation.performerId ?? 'belum tersedia'}`}
                      integration={satusehatSummary(observation.integrations)}
                      action={
                        <SatusehatActionGroup
                          resourceName={
                            observation.code.display ?? observation.code.code
                          }
                          onSync={() => onSyncObservation(observation.id)}
                          syncDisabled={Boolean(disabledReason)}
                          syncDisabledReason={disabledReason}
                          syncing={syncing}
                          showLabels
                        />
                      }
                      latestFailure={latestSync?.status === 'FAILED' ? latestSync.errorMessage : undefined}
                    />
                  );
                })}
              </div>
            ) : null}
          </RmeSatusehatCompletionStep>

          <RmeSatusehatCompletionStep
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Encounter selesai"
            description="Setelah RME FINAL dan Condition utama terhubung, preview harus menunjukkan UPDATE, finished, period.end, dan diagnosis reference."
            state={model.finalEncounter.state}
            blocker={model.finalEncounter.disabledReason}
            linkage={getIntegrationLinkage(encounter.integrations, 'SATUSEHAT')}
            latestSync={encounterIntegration?.latestSync}
            resourceName={encounter.encounterNumber}
            action={
              record?.status === MedicalRecordStatus.FINAL ? (
                <SatusehatActionGroup
                  resourceName={`${encounter.encounterNumber} selesai`}
                  onSync={() => setEncounterDialogOpen(true)}
                  syncDisabled={
                    localChangesPending ||
                    !canSync ||
                    model.finalEncounter.state === 'blocked'
                  }
                  syncDisabledReason={
                    localChangesPending
                      ? sharedSyncReason
                      : model.finalEncounter.disabledReason
                  }
                  showLabels
                />
              ) : undefined
            }
          />
        </div>
      </section>

      <EncounterSyncDialog
        key={encounterDialogOpen ? encounter.id : 'rme-encounter-sync-closed'}
        open={encounterDialogOpen}
        encounter={encounterDialogOpen ? encounter : null}
        canSync={canSync}
        previewSatusehat={encounterActions.previewSatusehat}
        syncSatusehat={encounterActions.syncSatusehat}
        onClose={() => setEncounterDialogOpen(false)}
        onSettled={async () => onEncounterSettled()}
      />
    </>
  );
}

function satusehatSummary(
  integrations: readonly ResourceIntegrationSummary[] | undefined,
) {
  return integrations?.find(
    (integration) => integration.provider.toUpperCase() === 'SATUSEHAT',
  );
}

function observationDetail(observation: ClinicalObservation): string {
  const name = observation.code.display ?? observation.code.code;
  if (observation.value.type === 'quantity') {
    const ucum = observation.value.code ?? observation.value.unit;
    return `${name} · ${observation.value.value} ${observation.value.unit} · UCUM ${ucum}`;
  }
  if (observation.value.type === 'code') {
    const value =
      observation.value.coding[0]?.display ??
      observation.value.coding[0]?.code ??
      'Belum tersedia';
    return `${name} · ${value}`;
  }
  return `${name} · ${String(observation.value.value)}`;
}
