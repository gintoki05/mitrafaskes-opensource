import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { getAuthConfig } from './auth.config';
import { authUserInclude } from './access-control.service';

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

const sessionUserInclude = authUserInclude;

export type AuthSessionWithUser = Prisma.AuthSessionGetPayload<{
  include: { user: { include: typeof sessionUserInclude } };
}>;

export interface AuthenticatedRequestSession {
  id: string;
  token: string;
  userId: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, metadata: SessionMetadata): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    const config = getAuthConfig();

    await this.prisma.authSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(now + config.sessionTtlMs),
        userAgent: metadata.userAgent?.slice(0, 512),
        ipAddress: metadata.ipAddress?.slice(0, 64),
      },
    });

    return token;
  }

  async findActive(token: string): Promise<AuthSessionWithUser | null> {
    if (!token || token.length > 512) return null;

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { include: sessionUserInclude } },
    });
    if (!session) return null;

    const now = Date.now();
    const config = getAuthConfig();
    const idleExpired =
      session.lastSeenAt.getTime() + config.sessionIdleTtlMs <= now;
    const expired = session.expiresAt.getTime() <= now;

    const temporaryPasswordExpired =
      session.user.mustChangePassword &&
      session.user.temporaryPasswordExpiresAt !== null &&
      session.user.temporaryPasswordExpiresAt.getTime() <= now;

    if (
      session.revokedAt ||
      expired ||
      idleExpired ||
      temporaryPasswordExpired ||
      !session.user.active
    ) {
      if (!session.revokedAt) {
        await this.revokeById(
          session.id,
          temporaryPasswordExpired
            ? 'TEMPORARY_PASSWORD_EXPIRED'
            : expired
              ? 'EXPIRED'
              : 'INACTIVE',
        );
      }
      return null;
    }

    if (now - session.lastSeenAt.getTime() >= 60_000) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now) },
      });
    }

    return session;
  }

  async revoke(token: string | undefined, reason = 'LOGOUT'): Promise<void> {
    if (!token) return;
    await this.prisma.authSession.updateMany({
      where: { tokenHash: this.hashToken(token), revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeById(id: string | undefined, reason = 'LOGOUT'): Promise<void> {
    if (!id) return;
    await this.prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeAllForUser(
    userId: string,
    reason: string,
    exceptSessionId?: string,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  setCookie(response: Response, token: string): void {
    const config = getAuthConfig();
    response.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: config.sessionTtlMs,
    });
  }

  clearCookie(response: Response): void {
    const config = getAuthConfig();
    response.clearCookie(config.cookieName, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
  }

  extractToken(request: {
    headers: { authorization?: string };
    cookies?: Record<string, string | undefined>;
  }): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      const bearer = authorization.slice('Bearer '.length).trim();
      if (bearer) return bearer;
    }

    return request.cookies?.[getAuthConfig().cookieName];
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
