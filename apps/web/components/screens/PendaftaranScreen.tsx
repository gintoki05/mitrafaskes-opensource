'use client';

import { useState, type SubmitEvent } from 'react';
import { Clock3, UserCheck, UserPlus } from 'lucide-react';
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
import { PatientRegistrationDialog } from './pendaftaran/PatientRegistrationDialog';
import type { PatientRegistrationFormValues } from './pendaftaran/patient-registration-schema';
import { QueuePanel } from './pendaftaran/QueuePanel';

export default function PendaftaranPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const session = useSession();
  const currentUser = session?.user ?? null;
  const canWritePatient = can(currentUser, AccessPermission.PATIENT_WRITE);
  const canCreateQueue = can(currentUser, AccessPermission.QUEUE_CREATE);
  const {
    patients,
    encounters,
    patientsLoading,
    encountersLoading,
    patientsError,
    encountersError,
    refreshPatients,
    refreshEncounters,
  } = useRegistrationData();

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void refreshPatients(search);
  };

  const handleCreatePatient = async (values: PatientRegistrationFormValues) => {
    try {
      const response = await apiFetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, phone: '' }),
      });
      if (response.ok) {
        setShowModal(false);
        toast.success('Data pasien berhasil disimpan.');
        void refreshPatients();
        return true;
      } else {
        throw new Error('Data pasien tidak dapat disimpan.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Data pasien belum tersimpan', {
        description:
          error instanceof Error
            ? error.message
            : 'Data pasien tidak dapat disimpan.',
        duration: 7000,
      });
      return false;
    }
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
        void refreshEncounters();
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

  const scrollToQueue = () => {
    document.getElementById('antrean-aktif')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <RouteGuard permission={AccessPermission.QUEUE_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-7">
        <PageHeader
          icon={<UserCheck className="h-6 w-6" />}
          title="Pendaftaran & Antrean"
          description="Daftarkan pasien baru dan kelola antrean poli dari satu ruang kerja."
          action={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={scrollToQueue}
                className="border-primary/30 bg-card text-primary hover:bg-primary/5"
              >
                <Clock3 className="h-4 w-4" />
                Antrean
                <span className="font-mono text-xs">{encounters.length}</span>
              </Button>
              {canWritePatient ? (
                <Button type="button" onClick={() => setShowModal(true)}>
                  <UserPlus className="h-4 w-4" />
                  Pasien Baru
                </Button>
              ) : null}
            </>
          }
        />

        {patientsError || encountersError ? (
          <ScreenState
            kind="error"
            title="Sebagian data tidak dapat dimuat"
            description={[patientsError, encountersError].filter(Boolean).join(' ')}
            compact
          />
        ) : null}

        <PatientDirectory
          patients={patients}
          patientsLoading={patientsLoading}
          patientsError={patientsError}
          search={search}
          canCreateQueue={canCreateQueue}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          onQueuePatient={handleDaftarAntrean}
        />
        <QueuePanel encounters={encounters} encountersLoading={encountersLoading} encountersError={encountersError} />
        <PatientRegistrationDialog
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreatePatient}
        />
      </div>
    </RouteGuard>
  );
}
