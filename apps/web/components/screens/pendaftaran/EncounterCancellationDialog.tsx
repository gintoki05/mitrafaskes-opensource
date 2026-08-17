'use client';

import { AlertTriangle } from 'lucide-react';
import type { Encounter } from '@mitrafaskes/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type EncounterCancellationDialogProps = {
  encounter: Encounter | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export function EncounterCancellationDialog({
  encounter,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: EncounterCancellationDialogProps) {
  if (!encounter) return null;

  const patientName = encounter.patient?.fullName ?? 'pasien ini';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Batalkan antrean?</AlertDialogTitle>
          <AlertDialogDescription>
            Antrean {encounter.queueNumber} untuk {patientName} akan dibatalkan.
            Status kunjungan {encounter.encounterNumber} akan berubah menjadi Dibatalkan
            dan tidak dapat dikembalikan setelah tindakan ini.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending ? 'Membatalkan...' : 'Ya, batalkan antrean'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
