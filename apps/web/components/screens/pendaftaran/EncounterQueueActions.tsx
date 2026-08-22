'use client';

import { useState } from 'react';
import { AlertTriangle, Pause, Play, RotateCcw, X } from 'lucide-react';
import { EncounterStatus } from '@mitrafaskes/shared';
import type { Encounter } from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import type { EncounterApiError } from '@/hooks/useEncounterActions';
import { EncounterCancellationDialog } from './EncounterCancellationDialog';
import { EncounterCorrectionDialog } from './EncounterCorrectionDialog';

type EncounterQueueActionsProps = {
  encounter: Encounter;
  updating: boolean;
  canStart: boolean;
  canCancel: boolean;
  canPause: boolean;
  canCorrect: boolean;
  canSync: boolean;
  onStatusChange: (
    encounter: Encounter,
    status: EncounterStatus,
    reason?: string,
  ) => Promise<void>;
  onSync: () => void;
};

function transitionErrorMessage(error: unknown): string {
  const typedError = error as EncounterApiError;
  if (typedError.code === 'ENCOUNTER_VERSION_CONFLICT') {
    return 'Data antrean sudah berubah oleh pengguna lain. Daftar antrean sudah dimuat ulang; coba aksi lagi.';
  }
  return error instanceof Error
    ? error.message
    : 'Status kunjungan belum dapat diperbarui.';
}

export function EncounterQueueActions({
  encounter,
  updating,
  canStart,
  canCancel,
  canPause,
  canCorrect,
  canSync,
  onStatusChange,
  onSync,
}: EncounterQueueActionsProps) {
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const transition = async (status: EncounterStatus, reason?: string) => {
    try {
      await onStatusChange(encounter, status, reason);
    } catch (error) {
      toast.error('Status kunjungan belum berubah', {
        description: transitionErrorMessage(error),
        duration: 7000,
      });
    }
  };

  const isArrived = encounter.status === EncounterStatus.ARRIVED;
  const isReadyToStart = isArrived || encounter.status === EncounterStatus.TRIAGED;
  const isInProgress = encounter.status === EncounterStatus.IN_PROGRESS;
  const isOnLeave = encounter.status === EncounterStatus.ONLEAVE;
  const canCorrectThis = canCorrect &&
    [
      EncounterStatus.ARRIVED,
      EncounterStatus.IN_PROGRESS,
      EncounterStatus.ONLEAVE,
      EncounterStatus.CANCELLED,
    ].includes(encounter.status);

  return (
    <>
      <div className="flex items-center gap-1" role="group" aria-label={`Aksi kunjungan ${encounter.encounterNumber}`}>
        {canStart && isReadyToStart ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={updating}
            onClick={() => void transition(EncounterStatus.IN_PROGRESS)}
            aria-label={`Mulai pemeriksaan ${encounter.encounterNumber}`}
            title={updating ? 'Memperbarui status...' : 'Mulai pemeriksaan (in-progress)'}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        {canPause && (isInProgress || isOnLeave) ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            disabled={updating}
            onClick={() => void transition(isInProgress ? EncounterStatus.ONLEAVE : EncounterStatus.IN_PROGRESS)}
            aria-label={`${isInProgress ? 'Tunda sementara' : 'Lanjutkan'} pemeriksaan ${encounter.encounterNumber}`}
            title={isInProgress ? 'Ubah ke onleave' : 'Lanjutkan ke in-progress'}
          >
            {isInProgress ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
        ) : null}
        {canCancel && isArrived ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={updating}
            onClick={() => setCancellationOpen(true)}
            aria-label={`Batalkan kunjungan ${encounter.encounterNumber}`}
            title={updating ? 'Memperbarui status...' : 'Batalkan (cancelled)'}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        {canCorrectThis ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={updating}
            onClick={() => setCorrectionOpen(true)}
            aria-label={`Tandai salah input ${encounter.encounterNumber}`}
            title="Tandai entered-in-error"
            className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        <SatusehatActionGroup
          resourceName={encounter.encounterNumber}
          onSync={onSync}
          syncDisabled={!canSync}
          syncDisabledReason="Peran Anda tidak memiliki izin sinkronisasi Encounter."
        />
      </div>
      <EncounterCancellationDialog
        encounter={cancellationOpen ? encounter : null}
        open={cancellationOpen}
        pending={updating}
        onOpenChange={setCancellationOpen}
        onConfirm={() => {
          void transition(EncounterStatus.CANCELLED).then(() => setCancellationOpen(false));
        }}
      />
      <EncounterCorrectionDialog
        encounter={correctionOpen ? encounter : null}
        open={correctionOpen}
        pending={updating}
        onOpenChange={setCorrectionOpen}
        onConfirm={(reason) => {
          void transition(EncounterStatus.ENTERED_IN_ERROR, reason).then(() => setCorrectionOpen(false));
        }}
      />
    </>
  );
}
