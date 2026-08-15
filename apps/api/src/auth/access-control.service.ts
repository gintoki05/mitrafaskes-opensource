import { Injectable } from '@nestjs/common';
import {
  AccessPermission,
  AccessRoleSummary,
  evaluateAccess,
  PERMISSION_DEFINITIONS,
  UserRole,
  WorkProfileType,
} from '@mitrafaskes/shared';
import type { AccessRole, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type AccessRoleWithPermissions = Prisma.AccessRoleGetPayload<{
  include: { permissions: { include: { permission: true } } };
}>;

export type UserWithAccessRole = Prisma.UserGetPayload<{
  include: {
    accessRole: { include: { permissions: { include: { permission: true } } } };
  };
}>;

export function hasAuthenticatedPermission(
  user: {
    role: UserRole;
    permissions?: string[];
    accessRole?: { system: string; active?: boolean };
  },
  permission: AccessPermission,
): boolean {
  if (user.accessRole?.active === false) return false;
  if (user.accessRole?.system === 'SUPER_ADMIN') return true;
  if (user.accessRole) return user.permissions?.includes(permission) ?? false;
  return evaluateAccess(user.role, permission).allowed;
}

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async findRole(id: string): Promise<AccessRoleWithPermissions | null> {
    return this.prisma.accessRole.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findRoleByCode(
    code: string,
  ): Promise<AccessRoleWithPermissions | null> {
    return this.prisma.accessRole.findUnique({
      where: { code },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findUserWithAccessRole(id: string): Promise<UserWithAccessRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        accessRole: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
  }

  permissionCodes(
    role: AccessRoleWithPermissions | null | undefined,
  ): string[] {
    if (!role) return [];
    if (role.systemKind === 'SUPER_ADMIN') {
      return PERMISSION_DEFINITIONS.map((definition) => definition.code);
    }
    return role.permissions.map((item) => item.permissionCode);
  }

  hasPermission(
    role: AccessRoleWithPermissions | null | undefined,
    permission: AccessPermission,
    legacyRole?: UserRole | null,
  ): boolean {
    if (role && !role.active) return false;
    if (role?.systemKind === 'SUPER_ADMIN') return true;
    if (role) return this.permissionCodes(role).includes(permission);
    // Existing sessions created before the access-role migration remain usable
    // until they are refreshed. The fallback keeps that transition safe.
    if (legacyRole) return evaluateAccess(legacyRole, permission).allowed;
    return false;
  }

  toRoleSummary(
    role: AccessRole | null | undefined,
  ): AccessRoleSummary | undefined {
    if (!role) return undefined;
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? undefined,
      defaultRoute: role.defaultRoute,
      active: role.active,
      system: role.systemKind,
    };
  }

  workProfileForLegacyRole(role: UserRole): WorkProfileType {
    if (role === UserRole.DOKTER) return WorkProfileType.DOKTER;
    if (role === UserRole.PERAWAT) return WorkProfileType.PERAWAT;
    return WorkProfileType.NON_CLINICAL;
  }
}
