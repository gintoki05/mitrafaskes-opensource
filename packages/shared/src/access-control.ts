import { UserRole } from './types/auth';

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
  RME_READ = 'rme.read',
  RME_WRITE_DRAFT = 'rme.write-draft',
  RME_FINALIZE = 'rme.finalize',
  SYNC_STATUS_READ = 'sync.status-read',
  SYNC_RETRY = 'sync.retry',
  SYNC_PAYLOAD_READ = 'sync.payload-read',
  MASTER_DATA_READ = 'master-data.read',
  MASTER_DATA_WRITE = 'master-data.write',
}

export const ALL_USER_ROLES = [
  UserRole.PERAWAT,
  UserRole.DOKTER,
  UserRole.ADMIN,
] as const;

export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  [UserRole.PERAWAT]: 'Petugas pendaftaran',
  [UserRole.DOKTER]: 'Dokter',
  [UserRole.ADMIN]: 'Admin',
};

export const DEFAULT_ROUTE_BY_ROLE: Readonly<Record<UserRole, string>> = {
  [UserRole.PERAWAT]: '/pendaftaran',
  [UserRole.DOKTER]: '/rme',
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
