'use client';

import { MasterFaskesDialog } from './MasterFaskesDialog';
import { PractitionerCreateForm } from './PractitionerCreateForm';
import type { PractitionerCreateDialogProps } from './practitionerCreateTypes';

export type { PractitionerCreateDialogProps } from './practitionerCreateTypes';

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
