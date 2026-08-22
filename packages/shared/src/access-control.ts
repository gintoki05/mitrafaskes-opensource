import { UserRole, WorkProfileType } from './types/auth';

/**
 * Stable capability names shared by the web and API applications.
 *
 * Route guards and endpoint guards are implemented in PRI-10. Keeping the
 * policy here prevents each application from inventing a different matrix.
 */
export enum AccessPermission {
  LOGIN = 'auth.login',
  PATIENT_READ = 'patient.read',
  PATIENT_WRITE = 'patient.write',
  QUEUE_READ = 'queue.read',
  QUEUE_CREATE = 'queue.create',
  QUEUE_CANCEL = 'queue.cancel',
  QUEUE_START = 'queue.start',
  QUEUE_PAUSE = 'queue.pause',
  ENCOUNTER_CORRECT = 'encounter.correct',
  RME_READ = 'rme.read',
  RME_WRITE_DRAFT = 'rme.write-draft',
  RME_FINALIZE = 'rme.finalize',
  RME_TRIAGE_READ = 'rme.triage-read',
  RME_TRIAGE_WRITE = 'rme.triage-write',
  RME_TRIAGE_COMPLETE = 'rme.triage-complete',
  SYNC_STATUS_READ = 'sync.status-read',
  SYNC_RETRY = 'sync.retry',
  SYNC_PAYLOAD_READ = 'sync.payload-read',
  MASTER_DATA_READ = 'master-data.read',
  MASTER_DATA_WRITE = 'master-data.write',
  ACCOUNT_READ = 'account.read',
  ACCOUNT_WRITE = 'account.write',
  ACCOUNT_RESET_PASSWORD = 'account.reset-password',
  ROLE_READ = 'role.read',
  ROLE_WRITE = 'role.write',
  ACCESS_AUDIT_READ = 'access.audit-read',
}

export interface PermissionDefinition {
  code: AccessPermission;
  label: string;
  group: string;
  description: string;
  sensitive?: boolean;
  dependsOn?: readonly AccessPermission[];
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { code: AccessPermission.LOGIN, label: 'Login', group: 'Autentikasi', description: 'Masuk ke aplikasi.' },
  { code: AccessPermission.PATIENT_READ, label: 'Lihat pasien', group: 'Pasien', description: 'Melihat identitas pasien.' },
  { code: AccessPermission.PATIENT_WRITE, label: 'Kelola pasien', group: 'Pasien', description: 'Membuat dan mengubah identitas pasien.', dependsOn: [AccessPermission.PATIENT_READ] },
  { code: AccessPermission.QUEUE_READ, label: 'Lihat antrean', group: 'Antrean', description: 'Melihat antrean kunjungan.' },
  { code: AccessPermission.QUEUE_CREATE, label: 'Tambah antrean', group: 'Antrean', description: 'Menambahkan pasien ke antrean.', dependsOn: [AccessPermission.QUEUE_READ, AccessPermission.PATIENT_READ] },
  { code: AccessPermission.QUEUE_CANCEL, label: 'Batalkan antrean', group: 'Antrean', description: 'Membatalkan antrean.', dependsOn: [AccessPermission.QUEUE_READ] },
  { code: AccessPermission.QUEUE_START, label: 'Mulai pemeriksaan', group: 'Antrean', description: 'Memulai pemeriksaan.', dependsOn: [AccessPermission.QUEUE_READ] },
  { code: AccessPermission.QUEUE_PAUSE, label: 'Tunda sementara pemeriksaan', group: 'Antrean', description: 'Mengubah Encounter menjadi onleave atau melanjutkan pemeriksaan.', dependsOn: [AccessPermission.QUEUE_READ] },
  { code: AccessPermission.ENCOUNTER_CORRECT, label: 'Koreksi Encounter salah input', group: 'Encounter', description: 'Menandai Encounter yang belum final sebagai entered-in-error dengan alasan wajib.', sensitive: true, dependsOn: [AccessPermission.QUEUE_READ] },
  { code: AccessPermission.RME_READ, label: 'Lihat RME', group: 'RME', description: 'Melihat isi rekam medis elektronik.' },
  { code: AccessPermission.RME_WRITE_DRAFT, label: 'Simpan draft RME', group: 'RME', description: 'Membuat dan mengubah draft RME.', dependsOn: [AccessPermission.RME_READ] },
  { code: AccessPermission.RME_FINALIZE, label: 'Finalisasi RME', group: 'RME', description: 'Memfinalisasi RME dan encounter.', dependsOn: [AccessPermission.RME_READ] },
  { code: AccessPermission.RME_TRIAGE_READ, label: 'Lihat triase', group: 'Triase', description: 'Melihat alur triase.' },
  { code: AccessPermission.RME_TRIAGE_WRITE, label: 'Simpan triase', group: 'Triase', description: 'Mengubah draft triase.', dependsOn: [AccessPermission.RME_TRIAGE_READ] },
  { code: AccessPermission.RME_TRIAGE_COMPLETE, label: 'Selesaikan triase', group: 'Triase', description: 'Menyelesaikan triase.', dependsOn: [AccessPermission.RME_TRIAGE_READ] },
  { code: AccessPermission.SYNC_STATUS_READ, label: 'Lihat sinkronisasi', group: 'Integrasi', description: 'Melihat status sinkronisasi.' },
  { code: AccessPermission.SYNC_RETRY, label: 'Retry sinkronisasi', group: 'Integrasi', description: 'Mengulangi sinkronisasi yang aman.', dependsOn: [AccessPermission.SYNC_STATUS_READ] },
  { code: AccessPermission.SYNC_PAYLOAD_READ, label: 'Lihat payload mentah', group: 'Integrasi', description: 'Melihat payload sinkronisasi mentah.', sensitive: true, dependsOn: [AccessPermission.SYNC_STATUS_READ] },
  { code: AccessPermission.MASTER_DATA_READ, label: 'Lihat master data', group: 'Master data', description: 'Melihat data master lokal.' },
  { code: AccessPermission.MASTER_DATA_WRITE, label: 'Kelola master data', group: 'Master data', description: 'Membuat dan mengubah data master.', dependsOn: [AccessPermission.MASTER_DATA_READ] },
  { code: AccessPermission.ACCOUNT_READ, label: 'Lihat akun', group: 'Administrasi akses', description: 'Melihat akun pengguna.', sensitive: true },
  { code: AccessPermission.ACCOUNT_WRITE, label: 'Kelola akun', group: 'Administrasi akses', description: 'Membuat dan mengubah akun.', sensitive: true, dependsOn: [AccessPermission.ACCOUNT_READ] },
  { code: AccessPermission.ACCOUNT_RESET_PASSWORD, label: 'Reset password akun', group: 'Administrasi akses', description: 'Membuat password sementara untuk akun lain.', sensitive: true, dependsOn: [AccessPermission.ACCOUNT_READ] },
  { code: AccessPermission.ROLE_READ, label: 'Lihat role', group: 'Administrasi akses', description: 'Melihat role dan permission.', sensitive: true },
  { code: AccessPermission.ROLE_WRITE, label: 'Kelola role', group: 'Administrasi akses', description: 'Membuat dan mengubah role serta permission.', sensitive: true, dependsOn: [AccessPermission.ROLE_READ] },
  { code: AccessPermission.ACCESS_AUDIT_READ, label: 'Lihat audit akses', group: 'Administrasi akses', description: 'Melihat riwayat perubahan akun dan role.', sensitive: true, dependsOn: [AccessPermission.ACCOUNT_READ] },
] as const;

export const PERMISSION_DEPENDENCIES: Readonly<Record<AccessPermission, readonly AccessPermission[]>> =
  Object.fromEntries(
    PERMISSION_DEFINITIONS.map((definition) => [definition.code, definition.dependsOn ?? []]),
  ) as Record<AccessPermission, readonly AccessPermission[]>;

export function expandPermissionDependencies(
  permissions: readonly AccessPermission[],
): AccessPermission[] {
  const expanded = new Set<AccessPermission>(permissions);
  let changed = true;
  while (changed) {
    changed = false;
    for (const permission of [...expanded]) {
      for (const dependency of PERMISSION_DEPENDENCIES[permission] ?? []) {
        if (!expanded.has(dependency)) {
          expanded.add(dependency);
          changed = true;
        }
      }
    }
  }
  return PERMISSION_DEFINITIONS
    .map((definition) => definition.code)
    .filter((code) => expanded.has(code));
}

export const ALL_USER_ROLES = [
  UserRole.DOKTER,
  UserRole.PERAWAT,
  UserRole.PETUGAS_PENDAFTARAN,
  UserRole.ADMIN,
] as const;

export const WORK_PROFILE_LABELS: Readonly<Record<WorkProfileType, string>> = {
  [WorkProfileType.NON_CLINICAL]: 'Non-klinis',
  [WorkProfileType.DOKTER]: 'Dokter',
  [WorkProfileType.PERAWAT]: 'Perawat',
};

export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  [UserRole.DOKTER]: 'Dokter',
  [UserRole.PERAWAT]: 'Perawat klinis',
  [UserRole.PETUGAS_PENDAFTARAN]: 'Petugas pendaftaran',
  [UserRole.ADMIN]: 'Admin',
};

export const DEFAULT_ROUTE_BY_ROLE: Readonly<Record<UserRole, string>> = {
  [UserRole.DOKTER]: '/rme',
  [UserRole.PERAWAT]: '/triase',
  [UserRole.PETUGAS_PENDAFTARAN]: '/pendaftaran',
  [UserRole.ADMIN]: '/master-faskes',
};

const PUBLIC_PERMISSIONS = new Set<AccessPermission>([
  AccessPermission.LOGIN,
]);

export const ROLE_PERMISSIONS: Readonly<
  Record<UserRole, ReadonlySet<AccessPermission>>
> = {
  [UserRole.PERAWAT]: new Set([
    AccessPermission.PATIENT_READ,
    AccessPermission.QUEUE_READ,
    AccessPermission.RME_TRIAGE_READ,
    AccessPermission.RME_TRIAGE_WRITE,
    AccessPermission.RME_TRIAGE_COMPLETE,
    AccessPermission.MASTER_DATA_READ,
  ]),
  [UserRole.PETUGAS_PENDAFTARAN]: new Set([
    AccessPermission.PATIENT_READ,
    AccessPermission.PATIENT_WRITE,
    AccessPermission.QUEUE_READ,
    AccessPermission.QUEUE_CREATE,
    AccessPermission.QUEUE_CANCEL,
    AccessPermission.SYNC_STATUS_READ,
    AccessPermission.SYNC_RETRY,
    AccessPermission.MASTER_DATA_READ,
  ]),
  [UserRole.DOKTER]: new Set([
    AccessPermission.PATIENT_READ,
    AccessPermission.QUEUE_READ,
    AccessPermission.QUEUE_START,
    AccessPermission.QUEUE_PAUSE,
    AccessPermission.RME_READ,
    AccessPermission.RME_WRITE_DRAFT,
    AccessPermission.RME_FINALIZE,
    AccessPermission.MASTER_DATA_READ,
  ]),
  [UserRole.ADMIN]: new Set([
    AccessPermission.PATIENT_READ,
    AccessPermission.PATIENT_WRITE,
    AccessPermission.QUEUE_READ,
    AccessPermission.QUEUE_CREATE,
    AccessPermission.QUEUE_CANCEL,
    AccessPermission.ENCOUNTER_CORRECT,
    AccessPermission.SYNC_STATUS_READ,
    AccessPermission.SYNC_RETRY,
    AccessPermission.SYNC_PAYLOAD_READ,
    AccessPermission.MASTER_DATA_READ,
    AccessPermission.MASTER_DATA_WRITE,
  ]),
};

export type AccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      code: 'UNAUTHENTICATED' | 'FORBIDDEN';
      statusCode: 401 | 403;
    };

/**
 * Returns the API decision that the frontend must mirror.
 *
 * Public permissions never require a role. A missing role on a protected
 * capability is unauthenticated (401); an authenticated role without the
 * capability is forbidden (403).
 */
export function evaluateAccess(
  role: UserRole | null | undefined,
  permission: AccessPermission,
): AccessDecision {
  if (PUBLIC_PERMISSIONS.has(permission)) {
    return { allowed: true };
  }

  if (!role) {
    return {
      allowed: false,
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    };
  }

  if (!ROLE_PERMISSIONS[role].has(permission)) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      statusCode: 403,
    };
  }

  return { allowed: true };
}

export function hasPermission(
  role: UserRole | null | undefined,
  permission: AccessPermission,
): boolean {
  return evaluateAccess(role, permission).allowed;
}
