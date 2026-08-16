'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type {
  CreateEncounterDto,
  Patient,
  PractitionerSummary,
} from '@mitrafaskes/shared';
import { AlertTriangle, Building2, ClipboardPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldDescription, FieldError } from '@/components/ui/field';
import { FieldLabel, SelectField } from '../master-faskes/FormField';
import { MasterFaskesDialog } from '../master-faskes/MasterFaskesDialog';
import { useMasterFaskesData } from '@/hooks/useMasterFaskesData';
import { usePractitioners } from '@/hooks/usePractitioners';
import { useSession } from '@/hooks/useSession';
import { resolveSingleOrganizationScope } from './organization-scope';

type EncounterRegistrationDialogProps = {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSubmit: (input: CreateEncounterDto) => Promise<void>;
};

export function EncounterRegistrationDialog({
  open,
  patient,
  onClose,
  onSubmit,
}: EncounterRegistrationDialogProps) {
  const [locationId, setLocationId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const session = useSession();
  const master = useMasterFaskesData();
  const organizationScope = useMemo(
    () =>
      resolveSingleOrganizationScope(
        master.organizations,
        session?.user.organization,
      ),
    [master.organizations, session?.user.organization],
  );
  const organizationId = organizationScope.organization?.id ?? '';
  const practitionerQuery = useMemo(
    () =>
      locationId
        ? {
            active: true,
            locationId,
            role: 'DOKTER' as const,
            page: 1,
            pageSize: 100,
          }
        : undefined,
    [locationId],
  );
  const practitioners = usePractitioners(practitionerQuery);

  const locations = useMemo(
    () => {
      return master.locations.filter(
        (location) =>
          location.active &&
          location.status === 'ACTIVE' &&
          location.organizationId === organizationId,
      );
    },
    [master.locations, organizationId],
  );
  const doctors = useMemo(
    () =>
      practitioners.items.filter(
        (practitioner): practitioner is PractitionerSummary =>
          practitioner.active &&
          practitioner.role === 'DOKTER' &&
          (practitioner.locations?.some((location) => location.id === locationId) ??
            practitioner.location?.id === locationId),
      ),
    [locationId, practitioners.items],
  );

  const handleLocationChange = (value: string) => {
    setLocationId(value);
    setDoctorId('');
    setFormError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!patient) return;
    if (!organizationId) {
      setFormError(
        organizationScope.reason === 'AMBIGUOUS'
          ? 'Akun ini memiliki lebih dari satu Organization aktif. Tetapkan satu faskes pada akun sebelum mendaftar.'
          : 'Akun ini belum terhubung ke Organization aktif. Tetapkan faskes pada akun sebelum mendaftar.',
      );
      return;
    }
    if (!locationId || !doctorId) {
      setFormError('Location dan dokter wajib dipilih sebelum mendaftar.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({ patientId: patient.id, locationId, doctorId });
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Pasien belum dapat dimasukkan ke antrean.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !patient) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Daftarkan ${patient.fullName} ke antrean`}
      onClose={onClose}
      className="max-w-2xl"
    >
      <Card>
        <CardHeader className="border-b border-border px-4 pb-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ClipboardPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                Daftarkan ke antrean
              </CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pilih poli dan dokter untuk membuat antrean lokal.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-foreground">{patient.fullName}</span>
                <span className="font-mono text-muted-foreground">RM {patient.medicalRecNo}</span>
                <Badge className="clinical-status-warning border text-[10px] font-bold">MENUNGGU</Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Tutup pendaftaran antrean"
              title="Tutup"
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-5 sm:px-6">
          <form className="space-y-5" onSubmit={submit}>
            {master.error ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{master.error}</span>
                </div>
              </div>
            ) : null}
            <div
              className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3"
              role={session === undefined || organizationId ? 'status' : 'alert'}
            >
              <Building2
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0 text-xs leading-relaxed">
                <p className="font-semibold text-foreground">Faskes pendaftaran</p>
                <p className="mt-0.5 font-medium text-primary">
                  {session === undefined
                    ? 'Memuat Organization...'
                    : organizationScope.organization
                      ? `${organizationScope.organization.code} · ${organizationScope.organization.name}`
                      : 'Organization belum ditetapkan'}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {organizationId
                    ? 'Pendaftaran memakai satu Organization. Pilihan di bawah hanya Location aktif milik faskes ini.'
                    : organizationScope.reason === 'AMBIGUOUS'
                      ? 'Ada lebih dari satu faskes aktif. Gunakan akun yang sudah ditugaskan ke satu faskes.'
                      : 'Minta admin menetapkan Organization pada akun ini sebelum membuat antrean.'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="encounter-location" required>
                  Location pelayanan
                </FieldLabel>
                <SelectField
                  id="encounter-location"
                  value={locationId}
                  onChange={handleLocationChange}
                  disabled={master.loading || submitting || !organizationId}
                  aria-label="Pilih Location pelayanan"
                >
                  <option value="">
                    {organizationId ? 'Pilih Location' : 'Organization belum tersedia'}
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} · {location.code}
                    </option>
                  ))}
                </SelectField>
                <FieldDescription className="mt-1">
                  Location aktif pada Organization terpilih. Akses triase mengikuti penugasan faskes dan poli.
                </FieldDescription>
                {organizationId && !master.loading && locations.length === 0 ? (
                  <FieldError className="mt-1">
                    Belum ada Location aktif pada Organization ini.
                  </FieldError>
                ) : null}
              </div>
              <div>
                <FieldLabel htmlFor="encounter-doctor" required>
                  Dokter ter-assign
                </FieldLabel>
                <SelectField
                  id="encounter-doctor"
                  value={doctorId}
                  onChange={setDoctorId}
                  disabled={!locationId || practitioners.loading || submitting}
                  aria-label="Pilih dokter ter-assign"
                >
                  <option value="">
                    {locationId
                      ? practitioners.loading
                        ? 'Memuat dokter...'
                        : 'Pilih dokter'
                      : 'Pilih Location dahulu'}
                  </option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.fullName}{doctor.sipNumber ? ` · ${doctor.sipNumber}` : ''}
                    </option>
                  ))}
                </SelectField>
                <FieldDescription className="mt-1">
                  Hanya dokter aktif di poli terpilih.
                </FieldDescription>
                {practitioners.error ? (
                  <FieldError className="mt-1">{practitioners.error}</FieldError>
                ) : null}
                {locationId && !practitioners.loading && !practitioners.error && doctors.length === 0 ? (
                  <FieldError className="mt-1">
                    Belum ada dokter aktif yang ter-assign ke Location ini.
                  </FieldError>
                ) : null}
              </div>
            </div>

            {formError ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  master.loading ||
                  !organizationId ||
                  !locationId ||
                  !doctorId
                }
              >
                {submitting ? 'Mendaftarkan...' : 'Daftarkan ke antrean'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MasterFaskesDialog>
  );
}
