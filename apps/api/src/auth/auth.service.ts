import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type {
  LoginRequest,
  LoginResponse,
  TokenResponse,
  UserLocationReference,
  UserOrganizationReference,
  UserProfile,
} from '@mitrafaskes/shared';
import { UserRole } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { authUserInclude, UserWithAccessRole } from './access-control.service';
import { PasswordService } from './password.service';
import { SessionMetadata, SessionService } from './session.service';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Username atau password salah',
  });
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async login(
    input: LoginRequest,
    metadata: SessionMetadata,
  ): Promise<{ token: string; response: TokenResponse }> {
    const username = this.normalizeUsername(input.username);
    const password = typeof input.password === 'string' ? input.password : '';
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: authUserInclude,
    });
    const passwordMatches = await this.passwords.verify(
      user?.passwordHash,
      password,
    );

    if (!user || !passwordMatches || !user.active) {
      throw invalidCredentials();
    }

    if (
      user.mustChangePassword &&
      user.temporaryPasswordExpiresAt &&
      user.temporaryPasswordExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        code: 'TEMPORARY_PASSWORD_EXPIRED',
        message:
          'Password sementara telah kedaluwarsa. Minta administrator melakukan reset.',
      });
    }

    const token = await this.sessions.create(user.id, metadata);
    return {
      token,
      response: {
        accessToken: token,
        user: this.toProfile(user),
      },
    };
  }

  async loginWithCookie(
    input: LoginRequest,
    metadata: SessionMetadata,
  ): Promise<{ token: string; response: LoginResponse }> {
    const result = await this.login(input, metadata);
    return {
      token: result.token,
      response: { user: result.response.user },
    };
  }

  async changePassword(
    userId: string,
    input: ChangePasswordRequest,
    currentSessionId?: string,
  ): Promise<LoginResponse> {
    if (
      typeof input.currentPassword !== 'string' ||
      typeof input.newPassword !== 'string' ||
      input.newPassword.length < 8
    ) {
      throw new UnauthorizedException({
        code: 'PASSWORD_POLICY_FAILED',
        message: 'Password baru minimal 8 karakter',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) throw invalidCredentials();

    const passwordMatches = await this.passwords.verify(
      user.passwordHash,
      input.currentPassword,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException({
        code: 'CURRENT_PASSWORD_INVALID',
        message: 'Password saat ini salah',
      });
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
      },
    });
    await this.sessions.revokeAllForUser(
      userId,
      'PASSWORD_CHANGED',
      currentSessionId,
    );

    const refreshed = await this.prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });
    return { user: this.toProfile(refreshed ?? user) };
  }

  toProfile(user: UserWithAccessRole | User): UserProfile {
    const accessRole = 'accessRole' in user ? user.accessRole : null;
    const permissions = accessRole
      ? accessRole.systemKind === 'SUPER_ADMIN'
        ? undefined
        : accessRole.permissions.map((item) => item.permissionCode)
      : undefined;
    const scopedUser = user as UserWithAccessRole;
    const organization = scopedUser.organization
      ? ({
          id: scopedUser.organization.id,
          code: scopedUser.organization.code,
          name: scopedUser.organization.name,
          active: scopedUser.organization.active,
        } satisfies UserOrganizationReference)
      : undefined;
    const locations = scopedUser.locationAssignments?.map(
      ({ location }) =>
        ({
          id: location.id,
          organizationId: location.organizationId,
          code: location.code,
          name: location.name,
          active: location.active,
        }) satisfies UserLocationReference,
    );

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as UserRole,
      ...(accessRole
        ? {
            accessRole: {
              id: accessRole.id,
              code: accessRole.code,
              name: accessRole.name,
              description: accessRole.description ?? undefined,
              defaultRoute: accessRole.defaultRoute,
              active: accessRole.active,
              system: accessRole.systemKind,
            },
            ...(permissions ? { permissions } : {}),
            defaultRoute: accessRole.defaultRoute,
          }
        : {}),
      ...((user as unknown as { workProfileType?: string }).workProfileType
        ? {
            workProfileType: (
              user as unknown as {
                workProfileType: UserProfile['workProfileType'];
              }
            ).workProfileType,
          }
        : {}),
      ...((user as User & { mustChangePassword?: boolean })
        .mustChangePassword !== undefined
        ? {
            mustChangePassword: (user as User & { mustChangePassword: boolean })
              .mustChangePassword,
          }
        : {}),
      ...((user as User & { temporaryPasswordExpiresAt?: Date | null })
        .temporaryPasswordExpiresAt
        ? {
            temporaryPasswordExpiresAt: (
              user as User & { temporaryPasswordExpiresAt: Date }
            ).temporaryPasswordExpiresAt.toISOString(),
          }
        : {}),
      sipNumber: user.sipNumber ?? undefined,
      strNumber: user.strNumber ?? undefined,
      ...(organization ? { organization } : {}),
      ...(locations?.length ? { locations } : {}),
    };
  }

  normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }
}
