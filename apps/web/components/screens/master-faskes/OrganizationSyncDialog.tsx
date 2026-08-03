'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Code, RefreshCw, ShieldCheck } from 'lucide-react';
import type { OrganizationSummary } from '@mitrafaskes/shared';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/auth';
import { MasterFaskesDialog } from './MasterFaskesDialog';
import { toast } from 'sonner';

type OrganizationSyncDialogProps = {
  open: boolean;
  organization: OrganizationSummary | null;
  canSync: boolean;
  onClose: () => void;
  onSynced: () => void;
};

type PreviewPayload = {
  operation?: string;
  externalResourceId?: string;
  payload?: unknown;
};

type PreviewState = {
  preview: PreviewPayload | null;
  loading: boolean;
  error: string;
};

async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    return new Error(message || fallback);
  } catch {
    return new Error(fallback);
  }
}

function OrganizationSyncDialogContent({
  organization,
  canSync,
  onClose,
  onSynced,
}: Omit<OrganizationSyncDialogProps, 'open'> & {
  organization: OrganizationSummary;
}) {
  const [state, setState] = useState<PreviewState>({
    preview: null,
    loading: true,
    error: '',
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await apiFetch(
          `/api/master/organizations/${organization.id}/satusehat/preview`,
        );
        if (!response.ok) {
          throw await readApiError(
            response,
            'Preview Organization SATUSEHAT tidak tersedia.',
          );
        }
        const preview = (await response.json()) as PreviewPayload;
        if (!cancelled) {
          setState({ preview, loading: false, error: '' });
        }
      } catch (requestError) {
        if (!cancelled) {
          setState({
            preview: null,
            loading: false,
            error:
              requestError instanceof Error
                ? requestError.message
                : 'Preview Organization SATUSEHAT tidak tersedia.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organization.id]);

  const sync = async () => {
    setSyncing(true);

    try {
      const response = await apiFetch(
        `/api/master/organizations/${organization.id}/satusehat/sync`,
        { method: 'POST' },
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Organization tidak dapat disinkronkan ke SATUSEHAT.',
        );
      }
      await response.json();
      toast.success('Organization berhasil disinkronkan ke SATUSEHAT.');
      onSynced();
    } catch (requestError) {
      toast.error('Sinkronisasi Organization gagal', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Organization tidak dapat disinkronkan ke SATUSEHAT.',
        duration: 7000,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Code className="h-4 w-4 text-primary" />
          Preview Organization SATUSEHAT
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {organization.code} - {organization.name}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {state.error ? (
          <ScreenState
            kind="error"
            title="SATUSEHAT belum tersedia"
            description={state.error}
            compact
          />
        ) : null}
        {state.loading ? (
          <ScreenState
            kind="loading"
            title="Memuat preview payload"
            description="Payload FHIR sedang disiapkan."
            compact
          />
        ) : state.preview ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                Operasi: {state.preview.operation ?? 'UNKNOWN'}
              </Badge>
              {state.preview.externalResourceId ? (
                <Badge className="clinical-status-success border text-[10px]">
                  <ShieldCheck
                    className="mr-1 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Terhubung
                </Badge>
              ) : null}
            </div>
            <pre className="max-h-[50vh] overflow-auto rounded-[var(--radius-card)] border border-border bg-muted p-4 font-mono text-[11px] text-foreground">
              {JSON.stringify(
                state.preview.payload ?? state.preview,
                null,
                2,
              )}
            </pre>
          </>
        ) : null}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {canSync ? (
            <Button
              type="button"
              onClick={() => void sync()}
              disabled={state.loading || syncing || !state.preview}
              aria-busy={syncing}
            >
              {syncing ? (
                <RefreshCw
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {syncing ? 'Menyinkronkan...' : 'Sinkronkan ke SATUSEHAT'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function OrganizationSyncDialog({
  open,
  organization,
  canSync,
  onClose,
  onSynced,
}: OrganizationSyncDialogProps) {
  if (!open || !organization) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Preview SATUSEHAT ${organization.name}`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <OrganizationSyncDialogContent
        key={organization.id}
        organization={organization}
        canSync={canSync}
        onClose={onClose}
        onSynced={onSynced}
      />
    </MasterFaskesDialog>
  );
}
