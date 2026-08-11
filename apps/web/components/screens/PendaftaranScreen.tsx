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
import { EncounterRegistrationDialog } from './pendaftaran/EncounterRegistrationDialog';
import { RegistrationViewTabs, type RegistrationView } from './pendaftaran/RegistrationViewTabs';
import { usePatientActions } from './pendaftaran/usePatientActions';
import { useMaritalStatuses } from './pendaftaran/useMaritalStatuses';
import { useEncounterActions } from './pendaftaran/useEncounterActions';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

export default function PendaftaranPage() {
  const [search, setSearch] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState<boolean | undefined>(true);
  const [activeView, setActiveView] = useState<RegistrationView>('patients');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [syncingPatient, setSyncingPatient] = useState<Patient | null>(null);
  const [registrationPatient, setRegistrationPatient] = useState<Patient | null>(null);
  const [registrationDialogKey, setRegistrationDialogKey] = useState(0);
  const session = useSession();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const currentUser = session?.user ?? null;
  const maritalStatusLookup = useMaritalStatuses();
  const canWritePatient = can(currentUser, AccessPermission.PATIENT_WRITE);
  const canCreateQueue = can(currentUser, AccessPermission.QUEUE_CREATE);
  const canStartEncounter = can(currentUser, AccessPermission.QUEUE_START);
  const canCancelEncounter = can(currentUser, AccessPermission.QUEUE_CANCEL);
  const canCompleteEncounter = can(currentUser, AccessPermission.RME_FINALIZE);
  const {
    patients,
    patientsMeta,
    patientsStatusCounts,
    encounters,
    encountersMeta,
    patientsLoading,
    encountersLoading,
    patientsError,
    encountersError,
    refreshPatients,
    refreshEncounters,
  } = useRegistrationData();
  const patientActions = usePatientActions();
  const encounterActions = useEncounterActions();

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
    toast.success('Encounter lokal berhasil dibuat.', {
      description: `${encounter.encounterNumber} · Antrean ${encounter.queueNumber} · ${encounter.location?.name ?? 'Location terpilih'}`,
    });
    await refreshEncounters(encountersMeta.page);
  };

  const handleStatusChange = async (encounter: Encounter, status: EncounterStatus) => {
    try {
      const updated = await encounterActions.updateStatus(
        encounter.id,
        status,
        encounter.version,
      );
      toast.success('Status Encounter diperbarui.', {
        description: `${updated.encounterNumber} sekarang ${updated.status}.`,
      });
      await refreshEncounters(encountersMeta.page);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENCOUNTER_VERSION_CONFLICT') {
        await refreshEncounters(encountersMeta.page);
      }
      throw error;
    }
  };

  const activeError = activeView === 'patients' ? patientsError : encountersError;

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
              maritalStatuses={maritalStatusLookup.statuses}
            />
          </div>
        ) : (
          <div id="registration-panel-queue" role="tabpanel" aria-labelledby="registration-tab-queue" tabIndex={0}>
            <QueuePanel
              encounters={encounters}
              meta={encountersMeta}
              encountersLoading={encountersLoading}
              encountersError={encountersError}
              onPageChange={(page) => void refreshEncounters(page)}
              onStatusChange={handleStatusChange}
              canStart={canStartEncounter}
              canCancel={canCancelEncounter}
              canComplete={canCompleteEncounter}
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
