'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Save } from 'lucide-react';
import type { MedicalRecord } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ScreenState } from '@/components/ScreenState';
import type { RmeMutationState } from '@/hooks/useRmeLifecycle';

type LifecycleProps = {
  record: MedicalRecord | null;
  readOnly: boolean;
  isDirty: boolean;
  mutationState: RmeMutationState;
};

export function RmeLifecycleSummary({
  record,
  readOnly,
  isDirty,
  mutationState,
}: LifecycleProps) {
  return (
    <>
      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={readOnly ? 'default' : 'outline'}>
            {readOnly ? 'FINAL' : 'DRAFT'}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            Versi {record?.version ?? 0}
          </span>
          <span className="text-xs text-muted-foreground">
            {record
              ? `Disimpan ${new Date(record.updatedAt).toLocaleString('id-ID')}`
              : 'Belum pernah disimpan'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {mutationState === 'saving-draft'
            ? 'Menyimpan draft...'
            : mutationState === 'preflighting'
              ? 'Memeriksa kelengkapan finalisasi...'
            : mutationState === 'finalizing'
              ? 'Memfinalisasi RME...'
              : mutationState === 'draft-saved'
                ? 'Semua perubahan tersimpan'
                : isDirty
                  ? 'Ada perubahan belum disimpan'
                  : readOnly
                    ? `Final oleh ${record?.finalizedBy ?? 'klinisi'}`
                    : 'Siap diedit'}
        </span>
      </div>
      {readOnly ? (
        <ScreenState
          kind="success"
          title="RME sudah final"
          description="Catatan ini read-only. Perubahan berikutnya memerlukan workflow amendemen terpisah."
          compact
        />
      ) : null}
    </>
  );
}

type ActionProps = LifecycleProps & {
  busy: boolean;
  isSubmitting: boolean;
  canSaveDraft: boolean;
  canFinalize: boolean;
  onPreflight: () => Promise<boolean>;
  onFinalize: () => Promise<void>;
};

export function RmeLifecycleActions({
  record,
  readOnly,
  isDirty,
  mutationState,
  busy,
  isSubmitting,
  canSaveDraft,
  canFinalize,
  onPreflight,
  onFinalize,
}: ActionProps) {
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);

  if (readOnly) return null;

  const openFinalizeDialog = async () => {
    if (!canFinalize || !record || isDirty || busy || isSubmitting) return;
    if (await onPreflight()) setFinalizeDialogOpen(true);
  };

  const confirmFinalize = async () => {
    try {
      await onFinalize();
    } finally {
      setFinalizeDialogOpen(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        id="btn-save-rme-draft"
        type="submit"
        variant="outline"
        disabled={!canSaveDraft || busy || isSubmitting}
        className="py-4 text-sm font-bold"
      >
        <Save className="mr-2 h-5 w-5" />
        {mutationState === 'saving-draft' ? 'Menyimpan draft...' : 'Simpan draft'}
      </Button>
      <Button
        type="button"
        disabled={!canFinalize || !record || isDirty || busy || isSubmitting}
        onClick={() => void openFinalizeDialog()}
        title={isDirty ? 'Simpan perubahan sebagai draft sebelum finalisasi' : undefined}
        className="py-4 text-sm font-bold"
      >
        <CheckCircle className="mr-2 h-5 w-5 stroke-[2.5]" />
        {mutationState === 'preflighting'
          ? 'Memeriksa...'
          : mutationState === 'finalizing'
            ? 'Memfinalisasi...'
            : 'Finalisasi RME'}
      </Button>

      <AlertDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Finalisasi RME?</AlertDialogTitle>
            <AlertDialogDescription>
              RME akan menjadi read-only dan Encounter akan ditandai selesai.
              Pastikan asesmen, diagnosis, dan resep sudah benar sebelum
              melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy || isSubmitting}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmFinalize()}
              disabled={!canFinalize || !record || isDirty || busy || isSubmitting}
            >
              {mutationState === 'finalizing' ? 'Memfinalisasi...' : 'Finalisasi RME'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
