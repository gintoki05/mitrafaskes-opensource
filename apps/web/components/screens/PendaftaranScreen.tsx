'use client';

import React, { useState } from 'react';
import { Clock3, UserCheck, UserPlus } from 'lucide-react';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { Button } from '@/components/ui/button';
import { apiFetch, can } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useRegistrationData } from '@/hooks/useRegistrationData';
import { useSession } from '@/hooks/useSession';
import { PatientDirectory } from './pendaftaran/PatientDirectory';
import { PatientRegistrationDialog } from './pendaftaran/PatientRegistrationDialog';
import { QueuePanel } from './pendaftaran/QueuePanel';

export default function PendaftaranPage() {
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [operationError, setOperationError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('1992-05-10');
  const [gender, setGender] = useState('MALE');
  const [address, setAddress] = useState('');
  const [phone] = useState('');
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

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void refreshPatients(search);
  };

  const handleCreatePatient = async (event: React.FormEvent) => {
    event.preventDefault();
    setOperationError('');
    setSuccessMessage('');
    try {
      const response = await apiFetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, fullName, birthDate, gender, address, phone }),
      });
      if (response.ok) {
        setShowModal(false);
        setNik('');
        setFullName('');
        setSuccessMessage('Data pasien berhasil disimpan.');
        void refreshPatients();
      } else {
        throw new Error('Data pasien tidak dapat disimpan.');
      }
    } catch (error) {
      console.error(error);
      setOperationError(error instanceof Error ? error.message : 'Data pasien tidak dapat disimpan.');
    }
  };

  const handleDaftarAntrean = async (patientId: string) => {
    setOperationError('');
    setSuccessMessage('');
    try {
      const response = await apiFetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, doctorId: 'doc-001' }),
      });
      if (response.ok) {
        setSuccessMessage('Pasien berhasil ditambahkan ke antrean.');
        void refreshEncounters();
      } else {
        throw new Error('Pasien tidak dapat ditambahkan ke antrean.');
      }
    } catch (error) {
      console.error(error);
      setOperationError(error instanceof Error ? error.message : 'Pasien tidak dapat ditambahkan ke antrean.');
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
          title="Daftar Rekam Medis"
          description="Cari pasien berdasarkan NIK, nomor rekam medis, atau nama. Kelola pendaftaran dan antrean poli dari satu ruang kerja."
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

        {successMessage ? <ScreenState kind="success" title="Tindakan berhasil" description={successMessage} compact /> : null}
        {patientsError || encountersError || operationError ? (
          <ScreenState
            kind="error"
            title="Sebagian data tidak dapat dimuat"
            description={[patientsError, encountersError, operationError].filter(Boolean).join(' ')}
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
          nik={nik}
          fullName={fullName}
          birthDate={birthDate}
          gender={gender}
          address={address}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreatePatient}
          onNikChange={setNik}
          onFullNameChange={setFullName}
          onBirthDateChange={setBirthDate}
          onGenderChange={setGender}
          onAddressChange={setAddress}
        />
      </div>
    </RouteGuard>
  );
}
