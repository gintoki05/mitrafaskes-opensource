'use client';

import type { OrganizationSummary } from '@mitrafaskes/shared';
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

type OrganizationStatusAlertProps = {
  organization: OrganizationSummary | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function OrganizationStatusAlert({
  organization,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: OrganizationStatusAlertProps) {
  if (!organization) return null;

  const activating = !organization.active;
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
          <AlertDialogTitle>{actionLabel} organisasi?</AlertDialogTitle>
          <AlertDialogDescription>
            {activating
              ? `Organisasi/faskes “${organization.name}” akan diaktifkan dan tersedia kembali untuk pilihan data master.`
              : `Organisasi/faskes “${organization.name}” akan dinonaktifkan dan tidak tersedia untuk pilihan data master.`}
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
