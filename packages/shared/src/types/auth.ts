export enum UserRole {
  ADMIN = 'ADMIN',
  DOKTER = 'DOKTER',
  /** Clinical nurse role for triage and initial clinical documentation. */
  PERAWAT = 'PERAWAT',
  /** Non-clinical registration/queue operator role. */
  PETUGAS_PENDAFTARAN = 'PETUGAS_PENDAFTARAN',
}

/**
 * A user's operational profile is deliberately separate from the access role.
 * Access roles can be customised without changing clinical domain semantics.
 */
export enum WorkProfileType {
  NON_CLINICAL = 'NON_CLINICAL',
  DOKTER = 'DOKTER',
  PERAWAT = 'PERAWAT',
}

export interface AccessRoleSummary {
  id: string;
  code: string;
  name: string;
  description?: string;
  defaultRoute: string;
  active: boolean;
  system: 'STANDARD' | 'SUPER_ADMIN';
}

export interface PermissionSummary {
  code: string;
  label: string;
  group: string;
  description: string;
  sensitive?: boolean;
}

/**
 * Operational faskes context attached to a signed-in user. The context is
 * used by the UI to keep day-to-day workflows inside one organization while
 * the API remains the source of truth for authorization.
 */
export interface UserOrganizationReference {
  id: string;
  code: string;
  name: string;
  active?: boolean;
}

export interface UserLocationReference {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  active?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  accessRole?: AccessRoleSummary;
  permissions?: string[];
  defaultRoute?: string;
  workProfileType?: WorkProfileType;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: string;
  sipNumber?: string;
  strNumber?: string;
  organization?: UserOrganizationReference;
  locations?: UserLocationReference[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
}

export interface TokenResponse {
  accessToken: string;
  user: UserProfile;
}
