'use client';

import { useState } from 'react';
import { RefreshCw, UserRound } from 'lucide-react';
import type {
  LocationSummary,
  OrganizationSummary,
  PractitionerSummary,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePractitioners } from '@/hooks/usePractitioners';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { getIntegrationLinkage } from '@/lib/integrations';
import { FieldLabel, SelectField } from './FormField';
import {
  MasterFaskesDialog,
  useMasterFaskesDialogClose,
  useMasterFaskesDialogGuard,
} from './MasterFaskesDialog';
import { PractitionerLocationSelector } from './PractitionerLocationSelector';

type PractitionerProfileDialogProps = {
  open: boolean;
  practitioner: PractitionerSummary | null;
  canWrite: boolean;
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function PractitionerProfileDialog({
  open,
  practitioner,
  canWrite,
  organizations,
  locations,
  onClose,
  onSaved,
}: PractitionerProfileDialogProps) {
  if (!open || !practitioner) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Edit profil ${practitioner.fullName}`}
      onClose={onClose}
      className="max-w-xl"
    >
      <PractitionerProfileDialogContent
        key={practitioner.id}
        practitioner={practitioner}
        canWrite={canWrite}
        organizations={organizations}
        locations={locations}
        onClose={onClose}
        onSaved={onSaved}
      />
    </MasterFaskesDialog>
  );
}

function PractitionerProfileDialogContent({
  practitioner,
  canWrite,
  organizations,
  locations,
  onClose,
  onSaved,
}: Omit<PractitionerProfileDialogProps, 'open' | 'practitioner'> & {
  practitioner: PractitionerSummary;
}) {
  const { update } = usePractitioners();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const [nik, setNik] = useState(practitioner.nik ?? '');
  const [birthDate, setBirthDate] = useState(practitioner.birthDate ?? '');
  const [gender, setGender] = useState(practitioner.gender ?? '');
  const [organizationId, setOrganizationId] = useState(
    practitioner.organization?.id ?? '',
  );
  const [locationIds, setLocationIds] = useState(() =>
    practitioner.locations?.map((location) => location.id) ??
    (practitioner.location?.id ? [practitioner.location.id] : []),
  );
  const [active, setActive] = useState(practitioner.active ? 'true' : 'false');
  const [saving, setSaving] = useState(false);
  const requestClose = useMasterFaskesDialogClose(onClose);
  const initialLocationIds =
    practitioner.locations?.map((location) => location.id) ??
    (practitioner.location?.id ? [practitioner.location.id] : []);
  const hasUnsavedChanges =
    canWrite &&
    (nik !== (practitioner.nik ?? '') ||
      birthDate !== (practitioner.birthDate ?? '') ||
      gender !== (practitioner.gender ?? '') ||
      organizationId !== (practitioner.organization?.id ?? '') ||
      active !== (practitioner.active ? 'true' : 'false') ||
      locationIds.length !== initialLocationIds.length ||
      locationIds.some(
        (locationId, index) => locationId !== initialLocationIds[index],
      ));

  useMasterFaskesDialogGuard({
    hasUnsavedChanges,
    isBusy: saving,
  });
  const organizationOptions = organizations.filter(
    (organization) => organization.active || organization.id === organizationId,
  );

  const submit = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      await update(practitioner.id, {
        nik: nik.trim() || null,
        birthDate: birthDate || null,
        gender: gender || null,
        organizationId: organizationId || null,
        locationIds,
        active: active === 'true',
      });
      toast.success('Profil Practitioner berhasil diperbarui.');
      await onSaved();
      onClose();
    } catch (requestError) {
      toast.error('Profil Practitioner belum diperbarui', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Data Practitioner tidak dapat disimpan.',
        duration: 7000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
          Profil lokal Practitioner
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Data lokal tetap dapat diperbarui tanpa mengubah resource SATUSEHAT.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-[var(--radius-control)] border border-border bg-muted/40 p-3 text-sm">
          <strong>{practitioner.fullName}</strong>
          <p className="mt-1 text-xs text-muted-foreground">
            @{practitioner.username} · {practitioner.role === 'DOKTER' ? 'Dokter' : 'Perawat'}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {satusehat.available ? (
            <div>
              <FieldLabel htmlFor="practitioner-profile-satusehat-id">
                ID SATUSEHAT
              </FieldLabel>
              <Input
                id="practitioner-profile-satusehat-id"
                value={getIntegrationLinkage(practitioner.integrations, 'SATUSEHAT')?.externalResourceId ?? ''}
                readOnly
                className="font-mono"
                placeholder="Belum terhubung"
                disabled={!canWrite || saving}
              />
            </div>
          ) : null}
          <div>
            <FieldLabel htmlFor="practitioner-profile-nik" required>
              NIK
            </FieldLabel>
            <Input
              id="practitioner-profile-nik"
              inputMode="numeric"
              maxLength={16}
              value={nik}
              onChange={(event) => setNik(event.target.value)}
              placeholder="16 digit NIK"
              disabled={!canWrite || saving}
            />
          </div>
          <div>
            <FieldLabel htmlFor="practitioner-profile-birth-date">
              Tanggal lahir
            </FieldLabel>
            <Input
              id="practitioner-profile-birth-date"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              disabled={!canWrite || saving}
            />
          </div>
          <div>
            <FieldLabel htmlFor="practitioner-profile-gender">
              Jenis kelamin
            </FieldLabel>
            <SelectField
              id="practitioner-profile-gender"
              value={gender}
              onChange={setGender}
              disabled={!canWrite || saving}
            >
              <option value="">Belum diisi</option>
              <option value="MALE">Laki-laki</option>
              <option value="FEMALE">Perempuan</option>
            </SelectField>
          </div>
          <div>
            <FieldLabel htmlFor="practitioner-profile-active">Status</FieldLabel>
            <SelectField
              id="practitioner-profile-active"
              value={active}
              onChange={setActive}
              disabled={!canWrite || saving}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </SelectField>
          </div>
          <div>
            <FieldLabel htmlFor="practitioner-profile-organization">
              Organization
            </FieldLabel>
            <SelectField
              id="practitioner-profile-organization"
              value={organizationId}
              onChange={(value) => {
                setOrganizationId(value);
                setLocationIds([]);
              }}
              disabled={!canWrite || saving}
            >
              <option value="">Belum ditetapkan</option>
              {organizationOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.code} - {organization.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="sm:col-span-2">
            <PractitionerLocationSelector
              id="practitioner-profile-location"
              organizationId={organizationId}
              locations={locations}
              value={locationIds}
              onChange={setLocationIds}
              disabled={!canWrite || saving}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={requestClose} disabled={saving}>
            Batal
          </Button>
          {canWrite ? (
            <Button type="button" onClick={() => void submit()} disabled={saving} aria-busy={saving}>
              {saving ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" /> : null}
              {saving ? 'Menyimpan...' : 'Simpan profil'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
