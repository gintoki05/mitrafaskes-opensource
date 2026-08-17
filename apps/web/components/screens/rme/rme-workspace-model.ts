import {
  MEDICAL_RECORD_VALIDATION_PROFILE,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
  type Encounter,
  type MedicalRecord,
} from '@mitrafaskes/shared';

export type RmeWorkspaceViewState =
  | 'loading-queue'
  | 'queue-error'
  | 'empty'
  | 'loading-record'
  | 'record-error'
  | 'ready';

export type RmeVersionConflict = {
  message: string;
  currentVersion?: number;
};

export function resolveRmeWorkspaceViewState(input: {
  encountersLoading: boolean;
  queueError: string;
  hasSelectedEncounter: boolean;
  recordLoading: boolean;
  recordError: string;
}): RmeWorkspaceViewState {
  if (input.hasSelectedEncounter) {
    if (input.recordLoading) return 'loading-record';
    if (input.recordError) return 'record-error';
    return 'ready';
  }
  if (input.encountersLoading) return 'loading-queue';
  if (input.queueError) return 'queue-error';
  return 'empty';
}

export function versionConflictFrom(error: unknown): RmeVersionConflict | null {
  if (!error || typeof error !== 'object') return null;
  const value = error as {
    code?: unknown;
    message?: unknown;
    currentVersion?: unknown;
  };
  if (value.code !== 'RME_VERSION_CONFLICT') return null;
  return {
    message:
      typeof value.message === 'string'
        ? value.message
        : 'Draft sudah berubah di sesi lain.',
    currentVersion:
      typeof value.currentVersion === 'number' ? value.currentVersion : undefined,
  };
}

export function isRmeReadOnly(record: MedicalRecord | null): boolean {
  return record?.status === MedicalRecordStatus.FINAL;
}

export function resolveRmeProfiles(record: MedicalRecord | null) {
  const serviceProfile =
    record?.serviceProfile ?? MedicalRecordServiceProfile.OUTPATIENT_GENERAL;
  return {
    serviceProfile,
    serviceProfileLabel: 'Rawat jalan umum',
    validationProfile:
      record?.validationProfile ??
      MEDICAL_RECORD_VALIDATION_PROFILE[serviceProfile],
  };
}

export function buildRmeWorkspaceContext(
  encounter: Encounter,
  record: MedicalRecord | null,
) {
  const profiles = resolveRmeProfiles(record);
  const patient = encounter.patient;
  return {
    patientName: displayValue(patient?.fullName, 'Identitas pasien tidak tersedia'),
    medicalRecordNumber: displayValue(patient?.medicalRecNo),
    nik: displayValue(patient?.nik),
    birthDateAndAge: formatBirthDateAndAge(
      patient?.birthDate,
      encounter.queueDate,
    ),
    gender: patient?.gender === 'MALE'
      ? 'Laki-laki'
      : patient?.gender === 'FEMALE'
        ? 'Perempuan'
        : 'Belum tersedia',
    address: displayValue(patient?.address),
    encounterNumber: displayValue(encounter.encounterNumber),
    location: displayValue(encounter.location?.name),
    doctor: displayValue(encounter.doctor?.fullName),
    queueNumber: Number.isFinite(encounter.queueNumber)
      ? `#${encounter.queueNumber}`
      : 'Belum tersedia',
    arrivalTime: formatDateTime(encounter.arrivedAt),
    waitDuration: formatWaitDuration(encounter.arrivedAt, encounter.startedAt),
    ...profiles,
  };
}

function displayValue(value?: string, fallback = 'Belum tersedia'): string {
  return value?.trim() || fallback;
}

function formatBirthDateAndAge(
  birthDate?: string,
  referenceDate?: string,
): string {
  if (!birthDate) return 'Belum tersedia';
  const birth = parseDateOnly(birthDate);
  const reference = parseDateOnly(referenceDate ?? '');
  if (!birth || !reference || birth.getTime() > reference.getTime()) {
    return displayValue(birthDate);
  }
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const hasNotHadBirthday =
    reference.getUTCMonth() < birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() < birth.getUTCDate());
  if (hasNotHadBirthday) age -= 1;
  return `${new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(birth)} (${age} tahun)`;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: string): string {
  if (!value) return 'Belum tersedia';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatWaitDuration(arrivedAt?: string, startedAt?: string): string {
  if (!arrivedAt || !startedAt) return 'Belum tersedia';
  const arrived = new Date(arrivedAt).getTime();
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(arrived) || !Number.isFinite(started) || started < arrived) {
    return 'Belum tersedia';
  }
  const minutes = Math.floor((started - arrived) / 60_000);
  if (minutes < 60) return `${minutes} menit`;
  return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`;
}
