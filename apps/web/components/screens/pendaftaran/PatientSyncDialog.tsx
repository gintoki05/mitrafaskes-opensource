'use client';

import { useEffect, useState } from 'react';
import type {
  Patient,
  SatusehatPatientLookupIdentifier,
  SatusehatPatientLookupQuery,
  SatusehatPatientLinkRequest as PatientLinkRequest,
  SatusehatPatientMutationResponse,
  SatusehatPatientPreview,
  SatusehatPatientSearchResponse,
  SatusehatPatientSyncResult,
} from '@mitrafaskes/shared';
import { CheckCircle2, Code, Link2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { FieldLabel, SelectField } from '../master-faskes/FormField';
import { SatusehatLinkageBadge } from '../master-faskes/SatusehatLinkageBadge';
import { formatSatusehatOperation, SatusehatPreviewSummary } from '../master-faskes/SatusehatPreviewSummary';
import { isPatientPatchPayload, PatientPatchPreview } from './PatientPatchPreview';
import { PatientSatusehatResult } from './PatientSatusehatResult';

type PatientSyncDialogProps = {
  open: boolean;
  patient: Patient | null;
  canSync: boolean;
  previewSatusehat: (id: string) => Promise<SatusehatPatientPreview>;
  syncSatusehat: (id: string) => Promise<SatusehatPatientSyncResult>;
  lookupSatusehat: (query: SatusehatPatientLookupQuery) => Promise<SatusehatPatientSearchResponse>;
  linkSatusehat: (id: string, input: PatientLinkRequest) => Promise<SatusehatPatientMutationResponse>;
  onClose: () => void;
  onSynced: () => void | Promise<void>;
};

type PreviewState = {
  preview: SatusehatPatientPreview | null;
  loading: boolean;
  error: string;
};

export function PatientSyncDialog({
  open,
  patient,
  canSync,
  previewSatusehat,
  syncSatusehat,
  lookupSatusehat,
  linkSatusehat,
  onClose,
  onSynced,
}: PatientSyncDialogProps) {
  const [state, setState] = useState<PreviewState>({
    preview: null,
    loading: true,
    error: '',
  });
  const [syncing, setSyncing] = useState(false);
  const [lookup, setLookup] = useState<{
    items: SatusehatPatientSearchResponse['items'];
    loading: boolean;
    message: string;
  }>({ items: [], loading: false, message: '' });
  const [lookupIdentifierType, setLookupIdentifierType] =
    useState<SatusehatPatientLookupIdentifier>('NIK');
  const [lookupIhsNumber, setLookupIhsNumber] = useState(
    () => patient?.satusehat?.externalResourceId ?? patient?.satusehatId ?? '',
  );
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!open || !patient) return;
    let cancelled = false;

    void previewSatusehat(patient.id)
      .then((preview) => {
        if (!cancelled) setState({ preview, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (!cancelled) {
          setState({
            preview: null,
            loading: false,
            error: requestError instanceof Error
              ? requestError.message
              : 'Preview Patient SATUSEHAT tidak tersedia.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, patient, previewSatusehat]);

  if (!open || !patient) return null;

  const lookupIdentifier =
    lookupIdentifierType === 'NIK' ? patient.nik ?? '' : lookupIhsNumber;
  const lookupLabel = lookupIdentifierType === 'NIK' ? 'NIK' : 'Nomor IHS';
  const lookupValid =
    lookupIdentifierType === 'NIK'
      ? /^\d{16}$/.test(lookupIdentifier)
      : /^[A-Za-z0-9.-]{1,64}$/.test(lookupIdentifier);

  const lookupPatient = async () => {
    if (!lookupValid) {
      setLookup({
        items: [],
        loading: false,
        message: `${lookupLabel} belum diisi dengan format yang valid.`,
      });
      return;
    }
    setLookup({ items: [], loading: true, message: '' });
    setSelectedRemoteId(null);
    try {
      const result = await lookupSatusehat({
        identifierType: lookupIdentifierType,
        identifier: lookupIdentifier,
      });
      setLookup({
        items: result.items,
        loading: false,
        message: result.items.length === 0
          ? `Patient dengan ${lookupLabel} tersebut tidak ditemukan di SATUSEHAT.`
          : '',
      });
    } catch (requestError) {
      setLookup({
        items: [],
        loading: false,
        message: requestError instanceof Error
          ? requestError.message
          : 'Lookup Patient SATUSEHAT tidak tersedia.',
      });
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await syncSatusehat(patient.id);
      toast.success('Patient berhasil disinkronkan ke SATUSEHAT.');
      await onSynced();
      onClose();
    } catch (requestError) {
      void onSynced();
      toast.error('Sinkronisasi Patient gagal', {
        description: requestError instanceof Error
          ? requestError.message
          : 'Patient tidak dapat disinkronkan ke SATUSEHAT.',
        duration: 7000,
      });
    } finally {
      setSyncing(false);
    }
  };

  const linkExisting = async () => {
    if (!selectedRemoteId) return;
    setLinking(true);
    try {
      await linkSatusehat(patient.id, { externalResourceId: selectedRemoteId });
      toast.success('Patient lokal berhasil dihubungkan ke SATUSEHAT.');
      await onSynced();
      onClose();
    } catch (requestError) {
      void onSynced();
      toast.error('Linkage Patient gagal', {
        description: requestError instanceof Error
          ? requestError.message
          : 'Patient SATUSEHAT tidak dapat dihubungkan.',
        duration: 7000,
      });
    } finally {
      setLinking(false);
    }
  };

  const disabled = state.loading || syncing || linking || !state.preview;

  return (
    <MasterFaskesDialog
      open
      label={`Preview SATUSEHAT ${patient.fullName}`}
      onClose={onClose}
      className="max-w-4xl"
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Code className="h-4 w-4 text-primary" aria-hidden="true" />
            Preview Patient SATUSEHAT
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {patient.fullName} · {patient.medicalRecNo}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Status linkage tersimpan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status ini berasal dari ExternalResourceLink lokal, bukan dari state dialog.
              </p>
            </div>
            <SatusehatLinkageBadge linkage={patient.satusehat} resourceName={patient.fullName} />
          </div>

          {patient.satusehatSync?.status === 'FAILED' ? (
            <ScreenState
              kind="error"
              title="Percobaan terakhir gagal"
              description={patient.satusehatSync.errorMessage ?? 'Remote SATUSEHAT menolak operasi terakhir. Periksa data lalu coba lagi.'}
              compact
            />
          ) : null}

          {state.error ? (
            <ScreenState kind="error" title="Preview belum tersedia" description={state.error} compact />
          ) : state.loading ? (
            <ScreenState kind="loading" title="Memuat preview payload" description="Payload FHIR sedang disiapkan." compact />
          ) : state.preview ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  Operasi: {formatSatusehatOperation(state.preview.operation)}
                </Badge>
                {state.preview.externalResourceId ? (
                  <Badge className="clinical-status-success border text-[10px]">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Update linkage tersimpan
                  </Badge>
                ) : null}
              </div>
              {isPatientPatchPayload(state.preview.payload) ? (
                <PatientPatchPreview payload={state.preview.payload} />
              ) : (
                <SatusehatPreviewSummary
                  payload={state.preview.payload}
                  externalResourceId={state.preview.externalResourceId}
                />
              )}
            </>
          ) : null}

          <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Search className="h-4 w-4 text-primary" aria-hidden="true" />
                  Lookup Patient berdasarkan NIK atau Nomor IHS
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Temukan Patient yang sudah ada di SATUSEHAT sebelum membuat linkage baru.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-end">
              <div>
                <FieldLabel htmlFor="patient-sync-lookup-type">Cari berdasarkan</FieldLabel>
                <SelectField
                  id="patient-sync-lookup-type"
                  value={lookupIdentifierType}
                  onChange={(value) => {
                    setLookupIdentifierType(value as SatusehatPatientLookupIdentifier);
                    setLookup({ items: [], loading: false, message: '' });
                    setSelectedRemoteId(null);
                  }}
                  disabled={lookup.loading || syncing || linking}
                >
                  <option value="NIK">NIK</option>
                  <option value="IHS">Nomor IHS</option>
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="patient-sync-lookup-identifier">{lookupLabel}</FieldLabel>
                <Input
                  id="patient-sync-lookup-identifier"
                  value={lookupIdentifier}
                  onChange={(event) => setLookupIhsNumber(event.target.value)}
                  readOnly={lookupIdentifierType === 'NIK'}
                  placeholder={lookupIdentifierType === 'NIK' ? 'NIK pasien lokal' : 'Contoh: P02478375538'}
                  disabled={lookupIdentifierType === 'NIK' || lookup.loading || syncing || linking}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void lookupPatient()}
                disabled={!lookupValid || lookup.loading || syncing || linking}
                aria-busy={lookup.loading}
              >
                {lookup.loading ? <RefreshCw className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <Search className="h-3.5 w-3.5" aria-hidden="true" />}
                {lookup.loading ? 'Mencari...' : `Lookup ${lookupLabel}`}
              </Button>
            </div>
            {lookup.message ? <p className="rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-xs text-muted-foreground" role="status">{lookup.message}</p> : null}
            {lookup.items.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-3" aria-live="polite">
                {lookup.items.map((item) => (
                  <PatientSatusehatResult
                    key={item.externalResourceId}
                    item={item}
                    selected={selectedRemoteId === item.externalResourceId}
                    currentLocalResourceId={patient.id}
                    onSelect={() => setSelectedRemoteId(item.externalResourceId)}
                  />
                ))}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void linkExisting()}
                    disabled={!selectedRemoteId || linking || syncing}
                    aria-busy={linking}
                  >
                    {linking ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                    {linking ? 'Menghubungkan...' : 'Hubungkan hasil terpilih'}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
            {canSync ? (
              <Button type="button" onClick={() => void sync()} disabled={disabled} aria-busy={syncing}>
                {syncing ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {syncing ? 'Menyinkronkan...' : 'Sinkronkan ke SATUSEHAT'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
