'use client';

import { useState, type FormEvent } from 'react';
import { RefreshCw, Stethoscope } from 'lucide-react';
import type {
  PractitionerCreateRequest,
  SatusehatPractitionerRemoteSummary,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePractitioners } from '@/hooks/usePractitioners';
import { usePractitionerRoles } from '@/hooks/usePractitionerRoles';
import { PractitionerCreateClinicalFields } from './PractitionerCreateClinicalFields';
import { PractitionerCreateIdentityFields } from './PractitionerCreateIdentityFields';
import { PractitionerCreatePlacementFields } from './PractitionerCreatePlacementFields';
import { toPractitionerDraftPrefill } from './practitionerSatusehatPrefill';
import {
  useMasterFaskesDialogClose,
  useMasterFaskesDialogGuard,
} from './MasterFaskesDialog';
import {
  initialPractitionerForm,
  type PractitionerCreateDialogProps,
  type PractitionerFormState,
} from './practitionerCreateTypes';

export function PractitionerCreateForm({
  canWrite,
  organizations,
  locations,
  onClose,
  onSaved,
}: Omit<PractitionerCreateDialogProps, 'open'>) {
  const { create } = usePractitioners();
  const roleCatalog = usePractitionerRoles();
  const [form, setForm] = useState<PractitionerFormState>(
    initialPractitionerForm,
  );
  const [saving, setSaving] = useState(false);
  const requestClose = useMasterFaskesDialogClose(onClose);
  const hasUnsavedChanges = (
    Object.keys(initialPractitionerForm) as (keyof PractitionerFormState)[]
  ).some((field) => {
    if (field === 'locationIds') {
      const currentLocationIds = form.locationIds ?? [];
      const initialLocationIds = initialPractitionerForm.locationIds ?? [];
      return (
        currentLocationIds.length !== initialLocationIds.length ||
        currentLocationIds.some(
          (locationId, index) => locationId !== initialLocationIds[index],
        )
      );
    }

    return form[field] !== initialPractitionerForm[field];
  });

  useMasterFaskesDialogGuard({
    hasUnsavedChanges: canWrite && hasUnsavedChanges,
    isBusy: saving,
  });

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
    const selectedRole = roleCatalog.roles.find(
      (role) => role.code === form.role,
    );
    if (!selectedRole) {
      toast.error('Role Practitioner belum tersedia.', {
        description:
          roleCatalog.error || 'Muat ulang form sebelum menyimpan data.',
      });
      return;
    }

    setSaving(true);
    const payload: PractitionerCreateRequest = {
      username: form.username.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      role: form.role,
      accessRoleId: selectedRole.id,
      nik: form.nik?.trim() || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      sipNumber: form.sipNumber?.trim() || null,
      strNumber: form.strNumber?.trim() || null,
      organizationId: form.organizationId || null,
      locationIds: form.locationIds ?? [],
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
          <PractitionerCreateIdentityFields
            form={form}
            disabled={saving}
            updateField={updateField}
            roles={roleCatalog.roles}
            rolesLoading={roleCatalog.loading}
            rolesError={roleCatalog.error}
          />
          <PractitionerCreateClinicalFields
            form={form}
            disabled={saving}
            updateField={updateField}
            onApply={applySatusehatData}
          />
          <PractitionerCreatePlacementFields
            form={form}
            disabled={saving}
            organizations={organizations}
            locations={locations}
            updateField={updateField}
          />
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving || roleCatalog.loading || !roleCatalog.roles.length}
              aria-busy={saving}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
              ) : null}
              {saving ? 'Menyimpan...' : 'Simpan Practitioner'}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
