import type { AccessRoleSummary, PermissionSummary, UserRole, WorkProfileType } from './auth';

export interface AccountSummary {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  accessRole: AccessRoleSummary;
  workProfileType: WorkProfileType;
  nik?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  sipNumber?: string;
  strNumber?: string;
  organization?: { id: string; code: string; name: string };
  locations: { id: string; code: string; name: string }[];
  active: boolean;
  mustChangePassword: boolean;
  temporaryPasswordExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountListResponse {
  items: AccountSummary[];
  meta: { page: number; pageSize: number; total: number };
  statusCounts: { active: number; inactive: number };
}

export interface AccountMutationResponse {
  account: AccountSummary;
  temporaryPassword?: string;
  temporaryPasswordExpiresAt?: string;
}

export interface AccessRoleDetail extends AccessRoleSummary {
  usersCount: number;
  permissions: string[];
}

export interface AccessRoleListResponse {
  items: AccessRoleDetail[];
}

export interface PermissionCatalogResponse {
  items: PermissionSummary[];
}

export interface AccountAuditItem {
  id: string;
  eventType: string;
  summary: string;
  actor?: { id: string; username: string; fullName: string };
  createdAt: string;
}
