'use client';

import { useState, type SubmitEvent } from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import type { CreatePatientDto, Patient } from '@mitrafaskes/shared';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { Button } from '@/components/ui/button';
import { apiFetch, can } from '@/lib/auth';
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
import { RegistrationViewTabs, type RegistrationView } from './pendaftaran/RegistrationViewTabs';
import { usePatientActions } from './pendaftaran/usePatientActions';
import { useMaritalStatuses } from './pendaftaran/useMaritalStatuses';

export default function PendaftaranPage() {
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<RegistrationView>('patients');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [syncingPatient, setSyncingPatient] = useState<Patient | null>(null);
  const session = useSession();
  const currentUser = session?.user ?? null;
  const maritalStatusLookup = useMaritalStatuses();
  const canWritePatient = can(currentUser, AccessPermission.PATIENT_WRITE);
  const canCreateQueue = can(currentUser, AccessPermission.QUEUE_CREATE);
  const {
    patients,
    patientsMeta,
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

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void refreshPatients(search, 1);
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
    await refreshPatients(search, patientsMeta.page);
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

  const handleDaftarAntrean = async (patientId: string) => {
    try {
      const response = await apiFetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, doctorId: 'doc-001' }),
      });
      if (response.ok) {
        toast.success('Pasien berhasil ditambahkan ke antrean.');
        void refreshEncounters(encountersMeta.page);
      } else {
        throw new Error('Pasien tidak dapat ditambahkan ke antrean.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Pasien belum masuk antrean', {
        description:
          error instanceof Error
            ? error.message
            : 'Pasien tidak dapat ditambahkan ke antrean.',
        duration: 7000,
      });
    }
  };

  const activeError = activeView === 'patients' ? patientsError : encountersError;

  return (
    <RouteGuard permission={AccessPermission.QUEUE_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-7">
        <PageHeader
          icon={<UserCheck className="h-6 w-6" />}
          title="Pendaftaran"
          description="Cari data pasien, buat data baru, lalu masukkan kunjungan hari ini ke antrean."
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
              onPageChange={(page) => void refreshPatients(search, page)}
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
          open={Boolean(syncingPatient)}
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
