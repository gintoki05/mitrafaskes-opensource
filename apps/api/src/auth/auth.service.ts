import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type {
  LoginRequest,
  LoginResponse,
  TokenResponse,
  UserProfile,
} from '@mitrafaskes/shared';
import { UserRole } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
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
    const user = await this.prisma.user.findUnique({ where: { username } });
    const passwordMatches = await this.passwords.verify(
      user?.passwordHash,
      password,
    );

    if (!user || !passwordMatches || !user.active) {
      throw invalidCredentials();
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
      data: { passwordHash },
    });
    await this.sessions.revokeAllForUser(
      userId,
      'PASSWORD_CHANGED',
      currentSessionId,
    );

    return { user: this.toProfile(user) };
  }

  toProfile(
    user: Pick<
      User,
      'id' | 'username' | 'fullName' | 'role' | 'sipNumber' | 'strNumber'
    >,
  ): UserProfile {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as UserRole,
      sipNumber: user.sipNumber ?? undefined,
      strNumber: user.strNumber ?? undefined,
    };
  }

  normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }
}
