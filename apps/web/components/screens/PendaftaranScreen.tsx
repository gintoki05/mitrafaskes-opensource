'use client';

import { useState, type SubmitEvent } from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import type {
  CreatePatientDto,
  Encounter,
  EncounterStatus,
  Patient,
} from '@mitrafaskes/shared';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';
import { PatientDirectory } from './pendaftaran/PatientDirectory';
import { PatientDetailDialog } from './pendaftaran/PatientDetailDialog';
import { PatientFormDialog } from './pendaftaran/PatientFormDialog';
import { PatientSyncDialog } from './pendaftaran/PatientSyncDialog';
import { QueuePanel } from './pendaftaran/QueuePanel';
import {
  getQueueStatuses,
  type QueueStatusFilterValue,
} from './pendaftaran/QueueStatusFilter';
import { EncounterRegistrationDialog } from './pendaftaran/EncounterRegistrationDialog';
import { EncounterSyncDialog } from './encounters/EncounterSyncDialog';
import { shouldRefreshEncounterListAfterSync } from './encounters/encounter-sync-state';
import { RegistrationViewTabs, type RegistrationView } from './pendaftaran/RegistrationViewTabs';
import { usePatientActions } from './pendaftaran/usePatientActions';
import { useMaritalStatuses } from './pendaftaran/useMaritalStatuses';
import { useEncounterActions } from '@/hooks/useEncounterActions';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

export default function PendaftaranPage() {
  const [search, setSearch] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState<boolean | undefined>(true);
  const [activeView, setActiveView] = useState<RegistrationView>('patients');
  const [queueStatusFilter, setQueueStatusFilter] = useState<QueueStatusFilterValue>('ACTIVE');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [syncingPatient, setSyncingPatient] = useState<Patient | null>(null);
  const [registrationPatient, setRegistrationPatient] = useState<Patient | null>(null);
  const [syncingEncounter, setSyncingEncounter] = useState<Encounter | null>(null);
  const [registrationDialogKey, setRegistrationDialogKey] = useState(0);
  const session = useSession();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const currentUser = session?.user ?? null;
  const maritalStatusLookup = useMaritalStatuses();
  const canWritePatient = can(currentUser, AccessPermission.PATIENT_WRITE);
  const canCreateQueue = can(currentUser, AccessPermission.QUEUE_CREATE);
  const canStartEncounter = can(currentUser, AccessPermission.QUEUE_START);
  const canCancelEncounter = can(currentUser, AccessPermission.QUEUE_CANCEL);
  const canSyncEncounter = can(currentUser, AccessPermission.SYNC_RETRY);
  const {
    patients,
    patientsMeta,
    patientsStatusCounts,
    encounters,
    encountersMeta,
    encountersStatusCounts,
    patientsLoading,
    encountersLoading,
    patientsError,
    encountersError,
    refreshPatients,
    refreshEncounters,
  } = useRegistrationData();
  const patientActions = usePatientActions();
  const encounterActions = useEncounterActions();
  const queueStatuses = getQueueStatuses(queueStatusFilter);

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void refreshPatients(search, 1, patientStatusFilter);
  };

  const handlePatientStatusFilterChange = (active: boolean | undefined) => {
    setPatientStatusFilter(active);
    void refreshPatients(search, 1, active);
  };

  const openNewPatient = () => {
    setEditingPatient(null);
    setShowPatientForm(true);
  };

  const handleSavePatient = async (
    input: CreatePatientDto,
    patient: Patient | null,
  ): Promise<Patient> => {
    return patient
      ? patientActions.update(patient.id, input)
      : patientActions.create(input);
  };

  const handlePatientSaved = async () => {
    await refreshPatients(search, patientsMeta.page, patientStatusFilter);
  };

  const handleEditPatient = (patient: Patient) => {
    setDetailPatientId(null);
    setEditingPatient(patient);
    setShowPatientForm(true);
  };

  const handleSyncPatient = (patient: Patient) => {
    setDetailPatientId(null);
    setSyncingPatient(patient);
  };

  const handleDaftarAntrean = (patient: Patient) => {
    if (patient.active === false) {
      toast.error('Pasien nonaktif tidak dapat masuk antrean.', {
        description: 'Edit status pasien menjadi Aktif terlebih dahulu.',
      });
      return;
    }
    setDetailPatientId(null);
    setRegistrationDialogKey((current) => current + 1);
    setRegistrationPatient(patient);
  };

  const handleCreateEncounter = async (input: Parameters<typeof encounterActions.create>[0]) => {
    const encounter = await encounterActions.create(input);
    toast.success('Kunjungan lokal berhasil dibuat.', {
      description: `${encounter.encounterNumber} · Antrean ${encounter.queueNumber} · ${encounter.location?.name ?? 'Lokasi terpilih'}`,
    });
    await refreshEncounters(encountersMeta.page, queueStatuses);
  };

  const handleStatusChange = async (encounter: Encounter, status: EncounterStatus) => {
    try {
      const updated = await encounterActions.updateStatus(
        encounter.id,
        status,
        encounter.version,
      );
      toast.success('Status kunjungan diperbarui.', {
        description: `Kunjungan ${updated.encounterNumber} sudah diperbarui.`,
      });
      await refreshEncounters(encountersMeta.page, queueStatuses);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENCOUNTER_VERSION_CONFLICT') {
        await refreshEncounters(encountersMeta.page, queueStatuses);
      }
      throw error;
    }
  };

  const handleEncounterSyncSettled = async (
    outcome: 'SUCCESS' | 'FAILED',
  ) => {
    if (shouldRefreshEncounterListAfterSync(outcome)) {
      await refreshEncounters(encountersMeta.page, queueStatuses);
    }
  };

  const handleQueueStatusFilterChange = (filter: QueueStatusFilterValue) => {
    setQueueStatusFilter(filter);
    void refreshEncounters(1, getQueueStatuses(filter));
  };

  const activeError = activeView === 'patients' ? patientsError : encountersError;
  const retryActiveView = () => {
    if (activeView === 'patients') {
      void refreshPatients(search, patientsMeta.page, patientStatusFilter);
      return;
    }

    void refreshEncounters(encountersMeta.page, queueStatuses);
  };

  return (
    <RouteGuard permission={AccessPermission.QUEUE_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-7">
        <PageHeader
          icon={<UserCheck className="h-6 w-6" />}
          title="Pendaftaran"
          description="Kelola pasien dan antrean kunjungan."
          action={
            canWritePatient ? (
              <Button type="button" onClick={openNewPatient}>
                <UserPlus className="h-4 w-4" />
                Pasien Baru
              </Button>
            ) : null
          }
        />

        <RegistrationViewTabs
          activeView={activeView}
          patientCount={patientsMeta.total}
          queueCount={encountersMeta.total}
          onChange={setActiveView}
        />

        {activeError ? (
          <ScreenState
            kind="error"
            title={activeView === 'patients' ? 'Data pasien tidak dapat dimuat' : 'Antrean tidak dapat dimuat'}
            description={activeError}
            action={
              <Button type="button" variant="outline" size="sm" onClick={retryActiveView}>
                Coba lagi
              </Button>
            }
            compact
          />
        ) : null}

        {activeView === 'patients' ? (
          <div id="registration-panel-patients" role="tabpanel" aria-labelledby="registration-tab-patients" tabIndex={0}>
            <PatientDirectory
              patients={patients}
              patientsLoading={patientsLoading}
              patientsError={patientsError}
              meta={patientsMeta}
              search={search}
              canCreateQueue={canCreateQueue}
              canWritePatient={canWritePatient}
              onSearchChange={setSearch}
              onSearchSubmit={handleSearchSubmit}
              onPageChange={(page) => void refreshPatients(search, page, patientStatusFilter)}
              statusCounts={patientsStatusCounts}
              statusFilter={patientStatusFilter}
              onStatusFilterChange={handlePatientStatusFilterChange}
              onQueuePatient={handleDaftarAntrean}
              onViewPatient={(patient) => setDetailPatientId(patient.id)}
              onEditPatient={handleEditPatient}
              onSyncPatient={handleSyncPatient}
            />
          </div>
        ) : (
          <div id="registration-panel-queue" role="tabpanel" aria-labelledby="registration-tab-queue" tabIndex={0}>
            <QueuePanel
              encounters={encounters}
              meta={encountersMeta}
              statusCounts={encountersStatusCounts}
              encountersLoading={encountersLoading}
              encountersError={encountersError}
              statusFilter={queueStatusFilter}
              onStatusFilterChange={handleQueueStatusFilterChange}
              onPageChange={(page) => void refreshEncounters(page, queueStatuses)}
              onStatusChange={handleStatusChange}
              onSyncEncounter={setSyncingEncounter}
              canStart={canStartEncounter}
              canCancel={canCancelEncounter}
              canSync={canSyncEncounter}
            />
          </div>
        )}
        <PatientFormDialog
          open={showPatientForm}
          patient={editingPatient}
          canWrite={canWritePatient}
          onClose={() => setShowPatientForm(false)}
          onSubmit={handleSavePatient}
          onSaved={handlePatientSaved}
          maritalStatusLookup={maritalStatusLookup}
          lookupSatusehat={patientActions.lookupSatusehat}
        />
        <EncounterRegistrationDialog
          key={registrationDialogKey}
          open={Boolean(registrationPatient)}
          patient={registrationPatient}
          onClose={() => setRegistrationPatient(null)}
          onSubmit={handleCreateEncounter}
        />
        <EncounterSyncDialog
          key={syncingEncounter?.id ?? 'encounter-sync-closed'}
          open={satusehat.configured && Boolean(syncingEncounter)}
          encounter={syncingEncounter}
          canSync={canSyncEncounter}
          previewSatusehat={encounterActions.previewSatusehat}
          syncSatusehat={encounterActions.syncSatusehat}
          onClose={() => setSyncingEncounter(null)}
          onSettled={handleEncounterSyncSettled}
        />
        <PatientDetailDialog
          key={detailPatientId ?? 'patient-detail-closed'}
          open={Boolean(detailPatientId)}
          patientId={detailPatientId}
          canWrite={canWritePatient}
          canCreateQueue={canCreateQueue}
          getPatient={patientActions.get}
          onClose={() => setDetailPatientId(null)}
          onEdit={handleEditPatient}
          onQueue={handleDaftarAntrean}
          onSync={handleSyncPatient}
          maritalStatuses={maritalStatusLookup.statuses}
        />
          <PatientSyncDialog
            key={syncingPatient?.id ?? 'patient-sync-closed'}
            open={satusehat.configured && Boolean(syncingPatient)}
          patient={syncingPatient}
          canSync={canWritePatient}
          previewSatusehat={patientActions.previewSatusehat}
          syncSatusehat={patientActions.syncSatusehat}
          lookupSatusehat={patientActions.lookupSatusehat}
          linkSatusehat={patientActions.linkSatusehat}
          onClose={() => setSyncingPatient(null)}
          onSynced={handlePatientSaved}
        />
      </div>
    </RouteGuard>
  );
}
