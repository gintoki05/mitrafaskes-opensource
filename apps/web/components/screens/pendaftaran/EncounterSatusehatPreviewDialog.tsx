'use client';

import { useEffect, useState } from 'react';
import type { Encounter, SatusehatEncounterPreview } from '@mitrafaskes/shared';
import { AlertTriangle, CheckCircle2, Code2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenState } from '@/components/ScreenState';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';

type EncounterSatusehatPreviewDialogProps = {
  open: boolean;
  encounter: Encounter | null;
  loadPreview: (id: string) => Promise<SatusehatEncounterPreview>;
  onClose: () => void;
};

export function EncounterSatusehatPreviewDialog({
  open,
  encounter,
  loadPreview,
  onClose,
}: EncounterSatusehatPreviewDialogProps) {
  const [preview, setPreview] = useState<SatusehatEncounterPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open || !encounter) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      setPreview(null);
      try {
        const result = await loadPreview(encounter.id);
        if (!cancelled) setPreview(result);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Preview Encounter SATUSEHAT belum dapat dimuat.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [encounter, loadPreview, open, retryKey]);

  if (!open || !encounter) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Preview Encounter SATUSEHAT ${encounter.encounterNumber}`}
      onClose={onClose}
      className="max-w-4xl"
    >
      <Card>
        <CardHeader className="border-b border-border px-4 pb-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Preview Encounter SATUSEHAT
              </CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {encounter.encounterNumber} · {encounter.patient?.fullName ?? 'Pasien'} ·{' '}
                {encounter.location?.name ?? 'Location belum tersedia'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Tutup preview Encounter SATUSEHAT"
              title="Tutup preview"
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 py-5 sm:px-6">
          <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
            Preview ini hanya memeriksa dependency dan membentuk payload lokal. Tidak ada request remote SATUSEHAT, linkage, atau log sinkronisasi yang dibuat pada PRI-14.
          </div>

          {loading ? (
            <ScreenState
              kind="loading"
              title="Menyiapkan preview"
              description="Memeriksa linkage Patient, Practitioner, Location, dan Organization."
              compact
            />
          ) : error ? (
            <ScreenState
              kind="error"
              title="Preview belum tersedia"
              description={error}
              compact
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryKey((current) => current + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Coba lagi
                </Button>
              }
            />
          ) : preview ? (
            <>
              <div
                className={
                  preview.ready
                    ? 'flex items-start gap-2 rounded-md border border-success/25 bg-success/5 p-3 text-xs text-success'
                    : 'flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 p-3 text-xs text-warning-foreground'
                }
                role={preview.ready ? 'status' : 'alert'}
              >
                {preview.ready ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {preview.ready
                    ? 'Semua dependency memiliki linkage. Payload Encounter siap ditinjau untuk PRI-23.'
                    : 'Encounter belum dapat disiapkan untuk sinkronisasi karena dependency berikut belum terhubung.'}
                </span>
              </div>

              {preview.blockers.length ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">
                    Blocker dependency
                  </h3>
                  <ul className="space-y-2" aria-label="Blocker dependency Encounter">
                    {preview.blockers.map((blocker) => (
                      <li
                        key={`${blocker.resourceType}-${blocker.localResourceId}`}
                        className="rounded-md border border-border bg-muted/30 p-3 text-xs"
                      >
                        <div className="font-semibold text-foreground">{blocker.resourceType}</div>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {blocker.localResourceId}
                        </div>
                        <div className="mt-1 text-muted-foreground">{blocker.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {preview.payload ? (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">
                    Payload FHIR Encounter
                  </h3>
                  <pre className="max-h-[28rem] overflow-auto rounded-md border border-border bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100">
                    {JSON.stringify(preview.payload, null, 2)}
                  </pre>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
