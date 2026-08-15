import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AccountAuditItem,
  AccessPermission,
  AccessRoleDetail,
  AccessRoleListResponse,
  PERMISSION_DEFINITIONS,
  expandPermissionDependencies,
  PermissionCatalogResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { AccessControlService } from '../auth/access-control.service';
import { SessionService } from '../auth/session.service';
import type { AuthenticatedUser } from '../auth/session.guard';
import { validateRolePermissions } from './accounts.validation';

@Injectable()
export class AccessRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly sessions: SessionService,
  ) {}

  async list(): Promise<AccessRoleListResponse> {
    const roles = await this.prisma.accessRole.findMany({
      orderBy: [{ systemKind: 'desc' }, { name: 'asc' }],
      include: { permissions: true, _count: { select: { users: true } } },
    });
    return { items: roles.map((role) => this.toDetail(role)) };
  }

  permissions(): PermissionCatalogResponse {
    return {
      items: PERMISSION_DEFINITIONS.map((definition) => ({
        code: definition.code,
        label: definition.label,
        group: definition.group,
        description: definition.description,
        sensitive: definition.sensitive,
      })),
    };
  }

  async audit(id: string): Promise<AccountAuditItem[]> {
    await this.getRole(id);
    const events = await this.prisma.accountAuditEvent.findMany({
      where: { roleId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: { select: { id: true, username: true, fullName: true } },
      },
    });
    return events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      summary: event.summary,
      actor: event.actor ?? undefined,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async create(
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<AccessRoleDetail> {
    const body = roleBody(input, true);
    const permissions = this.normalizePermissions(
      validateRolePermissions(input),
    );
    this.assertSensitiveDelegation(permissions, actor);
    if (!body.defaultRoute)
      throw new BadRequestException({
        code: 'ROLE_DEFAULT_ROUTE_REQUIRED',
        message: 'Halaman awal role wajib dipilih.',
      });
    this.validateDefaultRoute(body.defaultRoute, permissions);
    try {
      const role = await this.prisma.$transaction(async (tx) => {
        const created = await tx.accessRole.create({
          data: {
            code: body.code,
            name: body.name,
            description: body.description,
            defaultRoute: body.defaultRoute,
            permissions: {
              create: permissions.map((permissionCode) => ({ permissionCode })),
            },
          },
          include: { permissions: true, _count: { select: { users: true } } },
        });
        await tx.accountAuditEvent.create({
          data: {
            eventType: 'ROLE_CREATED',
            actorUserId: actor.id,
            roleId: created.id,
            summary: `Role ${created.name} dibuat.`,
            metadata: { code: created.code, permissions },
          },
        });
        return created;
      });
      return this.toDetail(role);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({
          code: 'ACCESS_ROLE_CODE_EXISTS',
          message: 'Kode role sudah digunakan.',
        });
      throw error;
    }
  }

  async update(
    id: string,
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<AccessRoleDetail> {
    const existing = await this.getRole(id);
    if (existing.systemKind === 'SUPER_ADMIN')
      throw new ForbiddenException({
        code: 'SYSTEM_ROLE_IMMUTABLE',
        message: 'Role Super Admin tidak dapat diubah.',
      });
    const body = roleBody(input, false);
    if (body.active === false) {
      const usersCount = await this.prisma.user.count({
        where: { accessRoleId: id },
      });
      if (usersCount > 0) {
        throw new ConflictException({
          code: 'ACCESS_ROLE_IN_USE',
          message:
            'Pindahkan semua akun dari role ini sebelum mengarsipkannya.',
        });
      }
    }
    const permissions =
      body.permissions !== undefined
        ? this.normalizePermissions(validateRolePermissions(input))
        : undefined;
    if (permissions) this.assertSensitiveDelegation(permissions, actor);
    const nextDefaultRoute = body.defaultRoute ?? existing.defaultRoute;
    const nextPermissions =
      permissions ??
      (existing.permissions.map(
        (item) => item.permissionCode,
      ) as AccessPermission[]);
    const activeChanged =
      body.active !== undefined && body.active !== existing.active;
    this.validateDefaultRoute(nextDefaultRoute, nextPermissions);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (permissions) {
        await tx.accessRolePermission.deleteMany({ where: { roleId: id } });
        await tx.accessRolePermission.createMany({
          data: permissions.map((permissionCode) => ({
            roleId: id,
            permissionCode,
          })),
        });
      }
      const role = await tx.accessRole.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.defaultRoute ? { defaultRoute: body.defaultRoute } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
        },
        include: { permissions: true, _count: { select: { users: true } } },
      });
      await tx.accountAuditEvent.create({
        data: {
          eventType:
            activeChanged && body.active === false
              ? 'ROLE_ARCHIVED'
              : activeChanged && body.active === true
                ? 'ROLE_REACTIVATED'
                : permissions
                  ? 'ROLE_PERMISSIONS_UPDATED'
                  : 'ROLE_UPDATED',
          actorUserId: actor.id,
          roleId: id,
          summary: `Role ${role.name} diperbarui.`,
          metadata: {
            permissions,
            active: role.active,
            defaultRoute: role.defaultRoute,
          },
        },
      });
      return role;
    });
    if (permissions || body.active !== undefined) {
      const users = await this.prisma.user.findMany({
        where: { accessRoleId: id },
        select: { id: true },
      });
      await Promise.all(
        users.map((user) =>
          this.sessions.revokeAllForUser(user.id, 'ACCESS_ROLE_CHANGED'),
        ),
      );
    }
    return this.toDetail(updated);
  }

  private async getRole(id: string) {
    const role = await this.access.findRole(id);
    if (!role)
      throw new NotFoundException({
        code: 'ACCESS_ROLE_NOT_FOUND',
        message: 'Role tidak ditemukan.',
      });
    return role;
  }

  private normalizePermissions(input: AccessPermission[]): AccessPermission[] {
    const known = new Set(
      PERMISSION_DEFINITIONS.map((definition) => definition.code),
    );
    const unknown = input.filter((permission) => !known.has(permission));
    if (unknown.length)
      throw new BadRequestException({
        code: 'UNKNOWN_PERMISSION',
        message: `Permission tidak dikenal: ${unknown.join(', ')}`,
      });
    return expandPermissionDependencies([...new Set(input)]);
  }

  private assertSensitiveDelegation(
    permissions: AccessPermission[],
    actor: AuthenticatedUser,
  ): void {
    if (actor.accessRole?.system === 'SUPER_ADMIN') return;
    const sensitive = new Set(
      PERMISSION_DEFINITIONS.filter((definition) => definition.sensitive).map(
        (definition) => definition.code,
      ),
    );
    if (permissions.some((permission) => sensitive.has(permission)))
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_REQUIRED',
        message:
          'Hanya Super Admin yang dapat mendelegasikan permission administrasi atau sensitif.',
      });
  }

  private validateDefaultRoute(
    route: string,
    permissions: AccessPermission[],
  ): void {
    const required = DEFAULT_ROUTE_PERMISSIONS[route];
    if (!required)
      throw new BadRequestException({
        code: 'ROLE_DEFAULT_ROUTE_INVALID',
        message: 'Halaman awal role tidak dikenal.',
      });
    if (!permissions.includes(required))
      throw new BadRequestException({
        code: 'ROLE_DEFAULT_ROUTE_FORBIDDEN',
        message:
          'Role belum memiliki permission untuk halaman awal yang dipilih.',
      });
  }

  private toDetail(role: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    defaultRoute: string;
    active: boolean;
    systemKind: 'STANDARD' | 'SUPER_ADMIN';
    permissions: { permissionCode: string }[];
    _count: { users: number };
  }): AccessRoleDetail {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? undefined,
      defaultRoute: role.defaultRoute,
      active: role.active,
      system: role.systemKind,
      usersCount: role._count.users,
      permissions: role.permissions.map(
        (permission) => permission.permissionCode,
      ),
    };
  }
}

const DEFAULT_ROUTE_PERMISSIONS: Record<string, AccessPermission> = {
  '/administrasi/akun': AccessPermission.ACCOUNT_READ,
  '/administrasi/role': AccessPermission.ROLE_READ,
  '/master-faskes': AccessPermission.MASTER_DATA_READ,
  '/master-data': AccessPermission.MASTER_DATA_READ,
  '/master-data/wilayah': AccessPermission.MASTER_DATA_READ,
  '/master-data/icd10': AccessPermission.MASTER_DATA_READ,
  '/pendaftaran': AccessPermission.QUEUE_READ,
  '/riwayat-kunjungan': AccessPermission.QUEUE_READ,
  '/rme': AccessPermission.RME_READ,
  '/triase': AccessPermission.RME_TRIAGE_READ,
  '/satusehat': AccessPermission.SYNC_STATUS_READ,
};

type RoleBody = {
  code: string;
  name: string;
  description?: string | null;
  defaultRoute?: string;
  active?: boolean;
  permissions?: unknown;
};

function roleBody(input: unknown, creating: boolean): RoleBody {
  if (!input || typeof input !== 'object')
    throw new BadRequestException({
      code: 'ROLE_VALIDATION_FAILED',
      message: 'Payload role tidak valid.',
    });
  const body = input as Record<string, unknown>;
  const name = text(body.name, 'name', 150, !creating);
  const code = creating ? text(body.code, 'code', 64, false).toUpperCase() : '';
  if (creating && !/^[A-Z][A-Z0-9_]{2,63}$/.test(code))
    throw new BadRequestException({
      code: 'ROLE_CODE_INVALID',
      message:
        'Kode role hanya boleh berupa huruf kapital, angka, dan garis bawah.',
    });
  const result: RoleBody = {
    code,
    name,
    description:
      body.description === undefined
        ? undefined
        : body.description === null
          ? null
          : text(body.description, 'description', 500, true),
    defaultRoute:
      body.defaultRoute === undefined
        ? undefined
        : text(body.defaultRoute, 'defaultRoute', 200, false),
    active:
      body.active === undefined
        ? undefined
        : booleanValue(body.active, 'active'),
    ...(body.permissions === undefined
      ? {}
      : { permissions: body.permissions }),
  };
  if (creating && !Array.isArray(body.permissions))
    throw new BadRequestException({
      code: 'ROLE_PERMISSIONS_REQUIRED',
      message: 'Permission role wajib diisi.',
    });
  return result;
}

function text(
  value: unknown,
  field: string,
  max: number,
  optional: boolean,
): string {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw new BadRequestException({
      code: 'ROLE_VALIDATION_FAILED',
      message: `${field} wajib diisi.`,
    });
  }
  if (typeof value !== 'string' || value.trim().length > max || !value.trim())
    throw new BadRequestException({
      code: 'ROLE_VALIDATION_FAILED',
      message: `${field} tidak valid.`,
    });
  return value.trim();
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean')
    throw new BadRequestException({
      code: 'ROLE_VALIDATION_FAILED',
      message: `${field} harus berupa boolean.`,
    });
  return value;
}
