'use client';

import { useEffect, useState } from 'react';
import type {
  Encounter,
  SatusehatEncounterPreview,
  SatusehatEncounterSyncResult,
} from '@mitrafaskes/shared';
import { CheckCircle2, Code, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getIntegrationLinkage, getIntegrationSummary } from '@/lib/integrations';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import {
  formatSatusehatOperation,
  SatusehatPreviewSummary,
} from '../master-faskes/SatusehatPreviewSummary';
import { resolveEncounterSyncUiState } from './encounter-sync-state';

type EncounterSyncDialogProps = {
  open: boolean;
  encounter: Encounter | null;
  canSync: boolean;
  previewSatusehat: (id: string) => Promise<SatusehatEncounterPreview>;
  syncSatusehat: (id: string) => Promise<SatusehatEncounterSyncResult>;
  onClose: () => void;
  onSettled: (outcome: 'SUCCESS' | 'FAILED') => void | Promise<void>;
};

type PreviewState = {
  preview: SatusehatEncounterPreview | null;
  loading: boolean;
  error: string;
};

function requestErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Encounter tidak dapat disinkronkan ke SATUSEHAT.';
}

export function EncounterSyncDialog({
  open,
  encounter,
  canSync,
  previewSatusehat,
  syncSatusehat,
  onClose,
  onSettled,
}: EncounterSyncDialogProps) {
  const [state, setState] = useState<PreviewState>({
    preview: null,
    loading: true,
    error: '',
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!open || !encounter) return;
    let cancelled = false;

    void previewSatusehat(encounter.id)
      .then((preview) => {
        if (!cancelled) setState({ preview, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            preview: null,
            loading: false,
            error: requestErrorMessage(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [encounter, open, previewSatusehat]);

  if (!open || !encounter) return null;

  const integration = getIntegrationSummary(encounter.integrations, 'SATUSEHAT');
  const uiState = resolveEncounterSyncUiState({
    canSync,
    previewLoading: state.loading,
    previewError: state.error,
    syncing,
    previewOperation: state.preview?.operation,
    integration,
  });

  const sync = async () => {
    setSyncing(true);
    setState((current) => ({ ...current, error: '' }));
    try {
      const result = await syncSatusehat(encounter.id);
      await onSettled('SUCCESS');
      toast.success('Encounter berhasil disinkronkan ke SATUSEHAT.', {
        description: `${result.operation === 'UPDATE' ? 'Remote Encounter diperbarui' : 'Remote Encounter dibuat'} dengan ID yang tersimpan pada linkage.`,
      });
      onClose();
    } catch (error) {
      const message = requestErrorMessage(error);
      setState((current) => ({ ...current, error: message }));
      await onSettled('FAILED');
      toast.error('Sinkronisasi Encounter gagal', {
        description: message,
        duration: 8000,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <MasterFaskesDialog
      open
      label={`Sinkronisasi SATUSEHAT ${encounter.encounterNumber}`}
      onClose={onClose}
      className="max-w-4xl"
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Code className="h-4 w-4 text-primary" aria-hidden="true" />
            Preview Encounter SATUSEHAT
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {encounter.encounterNumber} · {encounter.patient?.fullName ?? 'Pasien'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Status linkage tersimpan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kegagalan update tidak menghapus koneksi terakhir yang berhasil.
              </p>
            </div>
            <SatusehatLinkageBadge
              linkage={getIntegrationLinkage(encounter.integrations, 'SATUSEHAT')}
              resourceName={encounter.encounterNumber}
            />
          </div>

          {uiState.error && !state.loading ? (
            <ScreenState
              kind="error"
              title={uiState.connected ? 'Sync terakhir perlu perhatian' : 'Encounter belum siap disinkronkan'}
              description={uiState.error}
              compact
            />
          ) : null}

          {state.loading ? (
            <ScreenState
              kind="loading"
              title="Memuat preview Encounter"
              description="Dependency dan payload FHIR sedang diperiksa."
              compact
            />
          ) : state.preview ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  Operasi: {formatSatusehatOperation(state.preview.operation)}
                </Badge>
                {uiState.repeatSync ? (
                  <Badge className="clinical-status-success border text-[10px]">
                    Repeat sync · remote ID tetap
                  </Badge>
                ) : null}
              </div>
              <SatusehatPreviewSummary
                payload={state.preview.payload}
                externalResourceId={state.preview.externalResourceId}
              />
            </>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={syncing}>
              Tutup
            </Button>
            <Button
              type="button"
              onClick={() => void sync()}
              disabled={uiState.disabled || !state.preview}
              aria-busy={syncing}
              title={uiState.disabledReason}
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {syncing
                ? 'Menyinkronkan...'
                : uiState.repeatSync
                  ? 'Sinkronkan ulang SATUSEHAT'
                  : 'Sinkronkan ke SATUSEHAT'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
