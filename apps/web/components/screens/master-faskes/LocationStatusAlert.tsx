'use client';

import type { LocationSummary } from '@mitrafaskes/shared';
import { Power } from 'lucide-react';
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

type LocationStatusAlertProps = {
  location: LocationSummary | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function LocationStatusAlert({
  location,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: LocationStatusAlertProps) {
  if (!location) return null;

  const activating = !location.active;
  const actionLabel = activating ? 'Aktifkan' : 'Nonaktifkan';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={
              activating
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            }
          >
            <Power className="h-5 w-5" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{actionLabel} location?</AlertDialogTitle>
          <AlertDialogDescription>
            {activating
              ? `Location/ruangan “${location.name}” akan diaktifkan dan tersedia kembali untuk pilihan data master.`
              : `Location/ruangan “${location.name}” akan dinonaktifkan dan tidak tersedia untuk pilihan data master.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant={activating ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Menyimpan...' : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
