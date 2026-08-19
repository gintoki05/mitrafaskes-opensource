'use client';

import { useEffect, useState } from 'react';
import type {
  Encounter,
  SatusehatEncounterPreview,
  SatusehatEncounterSyncResult,
} from '@mitrafaskes/shared';
import { CheckCircle2, RefreshCw, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getIntegrationLinkage, getIntegrationSummary } from '@/lib/integrations';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { resolveEncounterSyncUiState } from './encounter-sync-state';
import { EncounterSatusehatPreview } from './EncounterSatusehatPreview';

type EncounterPreviewResponse = Omit<SatusehatEncounterPreview, 'payload'> & {
  payload?: SatusehatEncounterPreview['payload'];
};

type EncounterSyncDialogProps = {
  open: boolean;
  encounter: Encounter | null;
  canSync: boolean;
  previewSatusehat: (id: string) => Promise<EncounterPreviewResponse>;
  syncSatusehat: (id: string) => Promise<SatusehatEncounterSyncResult>;
  onClose: () => void;
  onSettled: (outcome: 'SUCCESS' | 'FAILED') => void | Promise<void>;
};

type PreviewState = {
  preview: EncounterPreviewResponse | null;
  loading: boolean;
  error: string;
};

function requestErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Data kunjungan tidak dapat dikirim ke SATUSEHAT.';
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
  const [previewRequestKey, setPreviewRequestKey] = useState(0);

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
  }, [encounter, open, previewRequestKey, previewSatusehat]);

  if (!open || !encounter) return null;

  const integration = getIntegrationSummary(encounter.integrations, 'SATUSEHAT');
  const linkage = getIntegrationLinkage(encounter.integrations, 'SATUSEHAT');
  const latestSync = integration?.latestSync;
  const latestSyncFailed = integration?.latestSync?.status === 'FAILED';
  const uiState = resolveEncounterSyncUiState({
    canSync,
    previewLoading: state.loading,
    previewError: state.preview ? '' : state.error,
    syncing,
    previewOperation: state.preview?.operation,
    integration,
  });
  const displayError = state.error || uiState.error;

  const retryPreview = () => {
    setState({ preview: null, loading: true, error: '' });
    setPreviewRequestKey((current) => current + 1);
  };

  const sync = async () => {
    setSyncing(true);
    setState((current) => ({ ...current, error: '' }));
    try {
      const result = await syncSatusehat(encounter.id);
      await onSettled('SUCCESS');
      toast.success('Kunjungan berhasil dikirim ke SATUSEHAT.', {
        description:
          result.operation === 'UPDATE'
            ? 'Data kunjungan yang sudah terhubung berhasil diperbarui.'
            : 'Data kunjungan baru berhasil dibuat di SATUSEHAT.',
      });
      onClose();
    } catch (error) {
      const message = requestErrorMessage(error);
      setState((current) => ({ ...current, error: message }));
      await onSettled('FAILED');
      toast.error('Data kunjungan gagal dikirim', {
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
            <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
            Tinjau data kunjungan untuk SATUSEHAT
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {encounter.encounterNumber} · {encounter.patient?.fullName ?? 'Pasien'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Status koneksi SATUSEHAT</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {linkage
                  ? 'Kunjungan ini sudah terhubung. ID SATUSEHAT yang tersimpan akan digunakan untuk memperbarui datanya.'
                  : 'Kunjungan ini belum terhubung. Sinkronisasi pertama akan membuat data kunjungan baru di SATUSEHAT.'}
              </p>
            </div>
            <SatusehatLinkageBadge
              linkage={linkage}
              latestSync={latestSync}
              resourceName={encounter.encounterNumber}
            />
          </div>

          {displayError && !state.loading ? (
            <ScreenState
              kind="error"
              title={
                state.error && !state.preview
                  ? 'Data kunjungan belum siap dikirim'
                  : uiState.connected
                    ? 'Pembaruan data kunjungan terakhir gagal'
                    : 'Pengiriman data kunjungan terakhir gagal'
              }
              description={
                latestSyncFailed && uiState.connected
                  ? `${displayError} Koneksi yang sudah berhasil tetap tersimpan. Periksa data lalu coba kirim kembali.`
                  : `${displayError} Periksa data lalu coba lagi.`
              }
              action={
                !state.preview ? (
                  <Button type="button" size="sm" variant="outline" onClick={retryPreview}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Coba periksa lagi
                  </Button>
                ) : undefined
              }
              compact
            />
          ) : null}

          {state.loading ? (
            <ScreenState
              kind="loading"
              title="Memeriksa data kunjungan"
              description="Pasien, dokter, lokasi layanan, dan kesiapan pengiriman sedang diperiksa."
              compact
            />
          ) : state.preview ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Tindakan:{' '}
                  {state.preview.operation === 'UPDATE'
                    ? 'Perbarui kunjungan terhubung'
                    : 'Buat kunjungan baru'}
                </Badge>
                {uiState.repeatSync ? (
                  <Badge className="clinical-status-success border text-[10px]">
                    ID SATUSEHAT tetap digunakan
                  </Badge>
                ) : null}
              </div>
              <EncounterSatusehatPreview
                encounter={encounter}
                operation={state.preview.operation}
                externalResourceId={state.preview.externalResourceId}
                payload={state.preview.payload}
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
                  ? 'Perbarui di SATUSEHAT'
                  : 'Sinkronkan ke SATUSEHAT'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
