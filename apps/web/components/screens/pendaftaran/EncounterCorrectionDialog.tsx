'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';

type EncounterCorrectionDialogProps = {
  encounter: Encounter | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function EncounterCorrectionDialog({
  encounter,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: EncounterCorrectionDialogProps) {
  const [reason, setReason] = useState('');

  if (!encounter) return null;

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setReason('');
    void onConfirm(trimmed);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setReason('');
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Tandai entered-in-error?</AlertDialogTitle>
          <AlertDialogDescription>
            Encounter {encounter.encounterNumber} akan ditandai sebagai data
            salah input dan dikeluarkan dari alur aktif. Tindakan ini tercatat
            di riwayat audit dan tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="encounter-correction-reason" className="text-sm font-semibold text-foreground">
            Alasan koreksi <span className="text-destructive">*</span>
          </label>
          <Input
            id="encounter-correction-reason"
            value={reason}
            maxLength={500}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: pasien terdaftar pada dokter/lokasi yang salah"
            aria-describedby="encounter-correction-reason-help"
          />
          <p id="encounter-correction-reason-help" className="text-xs text-muted-foreground">
            Jelaskan kesalahan administratif atau klinis secara singkat.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={submit}
            disabled={pending || reason.trim().length === 0}
          >
            {pending ? 'Menyimpan...' : 'Tandai salah input'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
