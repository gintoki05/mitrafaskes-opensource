'use client';

import { useState, type FormEvent } from 'react';
import { RefreshCw, Stethoscope } from 'lucide-react';
import type {
  LocationSummary,
  OrganizationSummary,
  PractitionerCreateRequest,
  SatusehatPractitionerRemoteSummary,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePractitioners } from '@/hooks/usePractitioners';
import { FieldLabel, SelectField } from './FormField';
import { MasterFaskesDialog } from './MasterFaskesDialog';
import { PractitionerSatusehatLookupPanel } from './PractitionerSatusehatLookupPanel';
import { toPractitionerDraftPrefill } from './practitionerSatusehatPrefill';

type PractitionerCreateDialogProps = {
  open: boolean;
  canWrite: boolean;
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type PractitionerFormState = Omit<PractitionerCreateRequest, 'active'> & {
  active: string;
};

const initialValues: PractitionerFormState = {
  username: '',
  password: '',
  fullName: '',
  role: 'DOKTER',
  nik: '',
  birthDate: '',
  gender: null,
  sipNumber: '',
  strNumber: '',
  organizationId: null,
  locationId: null,
  active: 'true',
};

export function PractitionerCreateDialog({
  open,
  canWrite,
  organizations,
  locations,
  onClose,
  onSaved,
}: PractitionerCreateDialogProps) {
  if (!open) return null;

  return (
    <MasterFaskesDialog
      open
      label="Tambah Practitioner lokal"
      onClose={onClose}
      className="max-w-3xl"
    >
      <PractitionerCreateForm
        key="new-practitioner"
        canWrite={canWrite}
        organizations={organizations}
        locations={locations}
        onClose={onClose}
        onSaved={onSaved}
      />
    </MasterFaskesDialog>
  );
}

function PractitionerCreateForm({
  canWrite,
  organizations,
  locations,
  onClose,
  onSaved,
}: Omit<PractitionerCreateDialogProps, 'open'>) {
  const { create } = usePractitioners();
  const [form, setForm] = useState<PractitionerFormState>(initialValues);
  const [saving, setSaving] = useState(false);
  const availableLocations = form.organizationId
    ? locations.filter((location) => location.organizationId === form.organizationId)
    : [];

  const updateField = <K extends keyof PractitionerFormState>(
    field: K,
    value: PractitionerFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const applySatusehatData = (
    remote: SatusehatPractitionerRemoteSummary,
  ) => {
    const prefill = toPractitionerDraftPrefill(remote);
    setForm((current) => ({ ...current, ...prefill }));
    toast.success('Data SATUSEHAT sudah dimasukkan ke form.', {
      description: `${remote.name} · Nomor IHS ${remote.externalResourceId}`,
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;

    setSaving(true);
    const payload: PractitionerCreateRequest = {
      username: form.username.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      role: form.role,
      nik: form.nik?.trim() || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      sipNumber: form.sipNumber?.trim() || null,
      strNumber: form.strNumber?.trim() || null,
      organizationId: form.organizationId || null,
      locationId: form.locationId || null,
      active: form.active === 'true',
    };

    try {
      await create(payload);
      toast.success('Practitioner lokal berhasil ditambahkan.');
      await onSaved();
      onClose();
    } catch (requestError) {
      toast.error('Practitioner belum ditambahkan', {
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
          <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
          Tambah Practitioner lokal
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tarik data SATUSEHAT bila tersedia, lalu lengkapi dan simpan profil
          Practitioner lokal. Aksi tarik tidak membuat koneksi otomatis.
        </p>
      </CardHeader>
      <form onSubmit={submit} noValidate>
        <CardContent className="space-y-5 pt-5">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Identitas & akun</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Username dan password awal digunakan sebagai akun User lokal.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="practitioner-create-full-name" required>
                  Nama lengkap
                </FieldLabel>
                <Input
                  id="practitioner-create-full-name"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  placeholder="dr. Alexander"
                  disabled={saving}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-role" required>
                  Role
                </FieldLabel>
                <SelectField
                  id="practitioner-create-role"
                  value={form.role}
                  onChange={(value) => updateField('role', value as PractitionerFormState['role'])}
                  disabled={saving}
                >
                  <option value="DOKTER">Dokter</option>
                  <option value="PERAWAT">Perawat</option>
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-username" required>
                  Username
                </FieldLabel>
                <Input
                  id="practitioner-create-username"
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  placeholder="dr_alexander"
                  autoComplete="username"
                  disabled={saving}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-password" required>
                  Password awal
                </FieldLabel>
                <Input
                  id="practitioner-create-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                  disabled={saving}
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Data Practitioner</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tarik identitas bila tersedia di SATUSEHAT, atau lengkapi data
                lokal secara manual.
              </p>
            </div>
            <PractitionerSatusehatLookupPanel
              nik={form.nik ?? ''}
              disabled={saving}
              onNikChange={(value) => updateField('nik', value)}
              onApply={applySatusehatData}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="practitioner-create-birth-date">
                  Tanggal lahir
                </FieldLabel>
                <Input
                  id="practitioner-create-birth-date"
                  type="date"
                  value={form.birthDate ?? ''}
                  onChange={(event) => updateField('birthDate', event.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-gender">
                  Jenis kelamin
                </FieldLabel>
                <SelectField
                  id="practitioner-create-gender"
                  value={form.gender ?? ''}
                  onChange={(value) => updateField('gender', value ? (value as 'MALE' | 'FEMALE') : null)}
                  disabled={saving}
                >
                  <option value="">Belum diisi</option>
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-active">Status</FieldLabel>
                <SelectField
                  id="practitioner-create-active"
                  value={form.active}
                  onChange={(value) => updateField('active', value)}
                  disabled={saving}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-sip">Nomor SIP</FieldLabel>
                <Input
                  id="practitioner-create-sip"
                  value={form.sipNumber ?? ''}
                  onChange={(event) => updateField('sipNumber', event.target.value)}
                  placeholder="Opsional"
                  disabled={saving}
                />
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-str">Nomor STR</FieldLabel>
                <Input
                  id="practitioner-create-str"
                  value={form.strNumber ?? ''}
                  onChange={(event) => updateField('strNumber', event.target.value)}
                  placeholder="Opsional"
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Referensi penempatan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Hubungkan Practitioner ke data Organization dan Location lokal. Keduanya
                tidak wajib untuk menyimpan profil lokal.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="practitioner-create-organization">
                  Organization
                </FieldLabel>
                <SelectField
                  id="practitioner-create-organization"
                  value={form.organizationId ?? ''}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      organizationId: value || null,
                      locationId: null,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="">Belum ditetapkan</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.code} - {organization.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="practitioner-create-location">
                  Location
                </FieldLabel>
                <SelectField
                  id="practitioner-create-location"
                  value={form.locationId ?? ''}
                  onChange={(value) => updateField('locationId', value || null)}
                  disabled={saving || !form.organizationId}
                >
                  <option value="">
                    {form.organizationId ? 'Belum ditetapkan' : 'Pilih Organization dulu'}
                  </option>
                  {availableLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.code} - {location.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving} aria-busy={saving}>
              {saving ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" /> : null}
              {saving ? 'Menyimpan...' : 'Simpan Practitioner'}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
