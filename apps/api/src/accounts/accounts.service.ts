import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  AccountAuditItem,
  AccountListResponse,
  AccountMutationResponse,
  AccountSummary,
  WorkProfileType,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { hashPassword } from '../auth/password.service';
import { AccessControlService } from '../auth/access-control.service';
import { SessionService } from '../auth/session.service';
import type { AuthenticatedUser } from '../auth/session.guard';
import {
  AccountCreateInput,
  AccountListInput,
  AccountUpdateInput,
  validateAccountCreate,
  validateAccountUpdate,
} from './accounts.validation';
import {
  ACCOUNT_INCLUDE,
  AccountRecord,
  toAccountSummary,
} from './account.mapper';
import {
  generateTemporaryPassword,
  temporaryPasswordExpiry,
} from './account.credentials';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly sessions: SessionService,
  ) {}

  async list(input: AccountListInput = {}): Promise<AccountListResponse> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
    const where: Prisma.UserWhereInput = {};
    const search = input.search?.trim();
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (input.active !== undefined) where.active = input.active;
    if (input.accessRoleId) where.accessRoleId = input.accessRoleId;
    if (input.workProfileType) where.workProfileType = input.workProfileType;
    const [records, total, active, inactive] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: ACCOUNT_INCLUDE,
        orderBy: [{ fullName: 'asc' }, { username: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, active: true } }),
      this.prisma.user.count({ where: { ...where, active: false } }),
    ]);
    return {
      items: records.map((record) => toAccountSummary(record)),
      meta: { page, pageSize, total },
      statusCounts: { active, inactive },
    };
  }

  async findById(id: string): Promise<AccountSummary> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      include: ACCOUNT_INCLUDE,
    });
    if (!record)
      throw new NotFoundException({
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun tidak ditemukan.',
      });
    return toAccountSummary(record);
  }

  async create(
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<AccountMutationResponse> {
    const validated = this.parseCreate(input);
    const role = await this.requireRole(validated.accessRoleId);
    this.assertRoleAssignmentAllowed(role, actor);
    await this.validateLocations(
      validated.organizationId,
      validated.locationIds ?? [],
    );
    const temporaryPassword = generateTemporaryPassword();
    const temporaryPasswordExpiresAt = temporaryPasswordExpiry();
    const roleValue = this.compatibilityRole(
      role.code,
      validated.workProfileType,
    );
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username: validated.username,
            passwordHash: await hashPassword(temporaryPassword),
            fullName: validated.fullName,
            role: roleValue,
            accessRoleId: role.id,
            workProfileType: validated.workProfileType,
            nik: validated.nik,
            birthDate: validated.birthDate
              ? new Date(`${validated.birthDate}T00:00:00.000Z`)
              : null,
            gender: validated.gender,
            sipNumber: validated.sipNumber,
            strNumber: validated.strNumber,
            organizationId: validated.organizationId,
            locationId: validated.locationIds?.[0] ?? null,
            mustChangePassword: true,
            temporaryPasswordExpiresAt,
            locationAssignments: validated.locationIds?.length
              ? {
                  create: validated.locationIds.map((locationId) => ({
                    locationId,
                  })),
                }
              : undefined,
          },
          include: ACCOUNT_INCLUDE,
        });
        await tx.accountAuditEvent.create({
          data: {
            eventType: 'ACCOUNT_CREATED',
            actorUserId: actor.id,
            targetUserId: created.id,
            roleId: role.id,
            summary: `Akun ${created.username} dibuat.`,
            metadata: {
              role: role.code,
              workProfileType: validated.workProfileType,
            },
          },
        });
        return created;
      });
      return {
        account: toAccountSummary(record),
        temporaryPassword,
        temporaryPasswordExpiresAt: temporaryPasswordExpiresAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'ACCOUNT_USERNAME_ALREADY_EXISTS',
          message: 'Username tersebut sudah digunakan.',
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<AccountSummary> {
    const validated = this.parseUpdate(input);
    const existing = await this.getRecord(id);
    const nextRole = validated.accessRoleId
      ? await this.requireRole(validated.accessRoleId)
      : existing.accessRole;
    if (!nextRole)
      throw new BadRequestException({
        code: 'ACCOUNT_ROLE_REQUIRED',
        message: 'Role akun belum tersedia.',
      });
    this.assertRoleAssignmentAllowed(nextRole, actor);
    if (
      existing.active &&
      existing.accessRole?.systemKind === 'SUPER_ADMIN' &&
      nextRole.systemKind !== 'SUPER_ADMIN'
    ) {
      const superAdminCount = await this.prisma.user.count({
        where: { active: true, accessRole: { systemKind: 'SUPER_ADMIN' } },
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenException({
          code: 'LAST_SUPER_ADMIN',
          message: 'Super Admin aktif terakhir tidak dapat diturunkan rolenya.',
        });
      }
    }
    const workProfileType =
      validated.workProfileType ?? existing.workProfileType;
    if (
      validated.organizationId !== undefined ||
      validated.locationIds !== undefined
    ) {
      await this.validateLocations(
        validated.organizationId ?? existing.organizationId,
        validated.locationIds ??
          existing.locationAssignments.map((item) => item.locationId),
      );
    }
    const roleChanged = nextRole.id !== existing.accessRoleId;
    const profileChanged = workProfileType !== existing.workProfileType;
    const data: Prisma.UserUpdateInput = {
      ...(validated.username ? { username: validated.username } : {}),
      ...(validated.fullName !== undefined
        ? { fullName: validated.fullName }
        : {}),
      ...(validated.nik !== undefined ? { nik: validated.nik } : {}),
      ...(validated.birthDate !== undefined
        ? {
            birthDate: validated.birthDate
              ? new Date(`${validated.birthDate}T00:00:00.000Z`)
              : null,
          }
        : {}),
      ...(validated.gender !== undefined ? { gender: validated.gender } : {}),
      ...(validated.sipNumber !== undefined
        ? { sipNumber: validated.sipNumber }
        : {}),
      ...(validated.strNumber !== undefined
        ? { strNumber: validated.strNumber }
        : {}),
      ...(validated.organizationId !== undefined
        ? {
            organization: validated.organizationId
              ? { connect: { id: validated.organizationId } }
              : { disconnect: true },
          }
        : {}),
      ...(validated.accessRoleId !== undefined
        ? {
            accessRole: { connect: { id: nextRole.id } },
            role: this.compatibilityRole(
              nextRole.code,
              workProfileType as unknown as WorkProfileType,
            ),
          }
        : {}),
      ...(validated.workProfileType !== undefined
        ? {
            workProfileType,
            role: this.compatibilityRole(
              nextRole.code,
              workProfileType as unknown as WorkProfileType,
            ),
          }
        : {}),
    };
    const record = await this.prisma.$transaction(async (tx) => {
      if (validated.locationIds !== undefined) {
        await tx.practitionerLocationAssignment.deleteMany({
          where: { practitionerId: id },
        });
        if (validated.locationIds.length) {
          await tx.practitionerLocationAssignment.createMany({
            data: validated.locationIds.map((locationId) => ({
              practitionerId: id,
              locationId,
            })),
          });
        }
        data.location = validated.locationIds[0]
          ? { connect: { id: validated.locationIds[0] } }
          : { disconnect: true };
      }
      const updated = await tx.user.update({
        where: { id },
        data,
        include: ACCOUNT_INCLUDE,
      });
      await tx.accountAuditEvent.create({
        data: {
          eventType: roleChanged ? 'ACCOUNT_ROLE_CHANGED' : 'ACCOUNT_UPDATED',
          actorUserId: actor.id,
          targetUserId: id,
          roleId: nextRole.id,
          summary: `Akun ${updated.username} diperbarui.`,
          metadata: {
            roleChanged,
            profileChanged,
            role: nextRole.code,
            workProfileType,
          },
        },
      });
      return updated;
    });
    if (roleChanged || profileChanged)
      await this.sessions.revokeAllForUser(id, 'ACCESS_CHANGED');
    return toAccountSummary(record);
  }

  async setActive(
    id: string,
    active: boolean,
    actor: AuthenticatedUser,
  ): Promise<AccountSummary> {
    const existing = await this.getRecord(id);
    if (!active && existing.accessRole?.systemKind === 'SUPER_ADMIN') {
      const count = await this.prisma.user.count({
        where: { active: true, accessRole: { systemKind: 'SUPER_ADMIN' } },
      });
      if (count <= 1)
        throw new ForbiddenException({
          code: 'LAST_SUPER_ADMIN',
          message: 'Super Admin aktif terakhir tidak dapat dinonaktifkan.',
        });
    }
    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { active },
        include: ACCOUNT_INCLUDE,
      });
      await tx.accountAuditEvent.create({
        data: {
          eventType: active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
          actorUserId: actor.id,
          targetUserId: id,
          roleId: updated.accessRoleId,
          summary: `Akun ${updated.username} ${active ? 'diaktifkan' : 'dinonaktifkan'}.`,
        },
      });
      return updated;
    });
    if (!active)
      await this.sessions.revokeAllForUser(id, 'ACCOUNT_DEACTIVATED');
    return toAccountSummary(record);
  }

  async resetPassword(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AccountMutationResponse> {
    const temporaryPassword = generateTemporaryPassword();
    const expiresAt = temporaryPasswordExpiry();
    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true,
          temporaryPasswordExpiresAt: expiresAt,
        },
        include: ACCOUNT_INCLUDE,
      });
      await tx.accountAuditEvent.create({
        data: {
          eventType: 'ACCOUNT_PASSWORD_RESET',
          actorUserId: actor.id,
          targetUserId: id,
          roleId: updated.accessRoleId,
          summary: `Password akun ${updated.username} direset.`,
        },
      });
      return updated;
    });
    await this.sessions.revokeAllForUser(id, 'PASSWORD_RESET');
    return {
      account: toAccountSummary(record),
      temporaryPassword,
      temporaryPasswordExpiresAt: expiresAt.toISOString(),
    };
  }

  async audit(id: string): Promise<AccountAuditItem[]> {
    const events = await this.prisma.accountAuditEvent.findMany({
      where: { targetUserId: id },
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

  private async getRecord(id: string): Promise<AccountRecord> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      include: ACCOUNT_INCLUDE,
    });
    if (!record)
      throw new NotFoundException({
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun tidak ditemukan.',
      });
    return record;
  }

  private async requireRole(id: string) {
    const role = await this.access.findRole(id);
    if (!role || !role.active)
      throw new BadRequestException({
        code: 'ACCESS_ROLE_NOT_AVAILABLE',
        message: 'Role tidak tersedia atau sudah diarsipkan.',
      });
    return role;
  }

  private assertRoleAssignmentAllowed(
    role: { systemKind: string },
    actor: AuthenticatedUser,
  ): void {
    if (
      role.systemKind === 'SUPER_ADMIN' &&
      actor.accessRole?.system !== 'SUPER_ADMIN'
    )
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Hanya Super Admin yang dapat menetapkan role Super Admin.',
      });
  }

  private compatibilityRole(roleCode: string, profile: WorkProfileType): Role {
    if (profile === WorkProfileType.DOKTER) return Role.DOKTER;
    if (profile === WorkProfileType.PERAWAT) return Role.PERAWAT;
    return roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN'
      ? Role.ADMIN
      : Role.PETUGAS_PENDAFTARAN;
  }

  private async validateLocations(
    organizationId: string | null | undefined,
    locationIds: string[],
  ): Promise<void> {
    if (!locationIds.length) return;
    const count = await this.prisma.location.count({
      where: {
        id: { in: locationIds },
        ...(organizationId ? { organizationId } : {}),
        active: true,
      },
    });
    if (count !== locationIds.length)
      throw new BadRequestException({
        code: 'ACCOUNT_LOCATION_INVALID',
        message:
          'Salah satu lokasi tidak aktif atau tidak berada pada organisasi akun.',
      });
  }

  private parseCreate(input: unknown): AccountCreateInput {
    try {
      return validateAccountCreate(input);
    } catch (error) {
      throw new BadRequestException({
        code: 'ACCOUNT_VALIDATION_FAILED',
        message:
          error instanceof Error ? error.message : 'Data akun tidak valid.',
      });
    }
  }

  private parseUpdate(input: unknown): AccountUpdateInput {
    try {
      return validateAccountUpdate(input);
    } catch (error) {
      throw new BadRequestException({
        code: 'ACCOUNT_VALIDATION_FAILED',
        message:
          error instanceof Error ? error.message : 'Data akun tidak valid.',
      });
    }
  }
}
