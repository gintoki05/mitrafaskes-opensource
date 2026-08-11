'use client';

import { useEffect, useState } from 'react';
import type { MaritalStatusSummary, Patient } from '@mitrafaskes/shared';
import { Eye, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScreenState } from '@/components/ScreenState';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { PatientDetailContent } from './PatientDetailContent';
import { PatientStatusBadge } from './PatientStatusBadge';
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

type PatientDetailDialogProps = {
  open: boolean;
  patientId: string | null;
  canWrite: boolean;
  canCreateQueue: boolean;
  getPatient: (id: string) => Promise<Patient>;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
  onQueue: (patient: Patient) => void;
  onSync: (patient: Patient) => void;
  maritalStatuses: readonly MaritalStatusSummary[];
};

export function PatientDetailDialog({
  open,
  patientId,
  canWrite,
  canCreateQueue,
  getPatient,
  onClose,
  onEdit,
  onQueue,
  onSync,
  maritalStatuses,
}: PatientDetailDialogProps) {
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (!open || !patientId) return;
    let cancelled = false;

    void getPatient(patientId)
      .then((result) => {
        if (!cancelled) setPatient(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setPatient(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Detail pasien tidak dapat dimuat.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getPatient, open, patientId, requestKey]);

  if (!open || !patientId) return null;

  return (
    <MasterFaskesDialog
      open
      label={patient ? `Detail pasien ${patient.fullName}` : 'Detail pasien'}
      onClose={onClose}
      className="max-w-5xl"
    >
      <Card>
        <CardHeader className="border-b border-border px-4 pb-4 pt-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em]">
                <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
                Detail pasien
              </CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Cek identitas sebelum memasukkan pasien ke antrean.
              </p>
              {patient ? (
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-foreground">{patient.fullName}</span>
                  <span aria-hidden="true" className="text-muted-foreground">·</span>
                  <span className="font-mono text-muted-foreground">RM {patient.medicalRecNo}</span>
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
              {patient ? (
                <>
                  <PatientStatusBadge active={patient.active} className="text-[10px]" />
                  {satusehat.available ? (
                    <SatusehatLinkageBadge
                      linkage={getIntegrationLinkage(patient.integrations, 'SATUSEHAT')}
                      resourceName={patient.fullName}
                    />
                  ) : null}
                </>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label="Tutup detail pasien"
                title="Tutup detail pasien"
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-0 pt-4 sm:px-6">
          {loading || (!patient && !error) ? (
            <ScreenState
              kind="loading"
              title="Memuat detail pasien"
              description="Data terstruktur sedang diambil dari API lokal."
              compact
            />
          ) : error ? (
            <ScreenState
              kind="error"
              title="Detail belum tersedia"
              description={error}
              compact
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    setPatient(null);
                    setError('');
                    setRequestKey((current) => current + 1);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Coba lagi
                </Button>
              }
            />
          ) : patient ? (
            <>
              {satusehat.available && getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.status === 'FAILED' ? (
                <div
                  className="flex items-start gap-2 rounded-[var(--radius-card)] border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive"
                  role="alert"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
                  <p className="leading-relaxed">
                    Sync terakhir gagal, tetapi linkage sebelumnya tetap ada.
                    {getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.errorMessage
                      ? ` ${getLatestIntegrationSync(patient.integrations, 'SATUSEHAT')?.errorMessage}`
                      : ''}
                  </p>
                </div>
              ) : null}
              <PatientDetailContent
                patient={patient}
                canWrite={canWrite}
                canCreateQueue={canCreateQueue}
                onClose={onClose}
                onEdit={onEdit}
                onQueue={onQueue}
                onSync={onSync}
                maritalStatuses={maritalStatuses}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
