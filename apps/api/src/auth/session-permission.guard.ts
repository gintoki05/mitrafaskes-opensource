import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  AccessPermission,
  evaluateAccess,
  UserRole,
} from '@mitrafaskes/shared';
import {
  ACCESS_PERMISSION_KEY,
  IS_PUBLIC_KEY,
} from './access-control.decorator';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

const SESSIONS: Record<string, AuthenticatedUser> = {
  'mock-jwt-token-admin': {
    id: 'usr-admin',
    username: 'admin',
    role: UserRole.ADMIN,
  },
  'mock-jwt-token-dr_budi': {
    id: 'usr-dr_budi',
    username: 'dr_budi',
    role: UserRole.DOKTER,
  },
  'mock-jwt-token-perawat_ani': {
    id: 'usr-perawat_ani',
    username: 'perawat_ani',
    role: UserRole.PERAWAT,
  },
};

@Injectable()
export class SessionPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const permission = this.reflector.getAllAndOverride<AccessPermission>(
      ACCESS_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token =
      typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : undefined;
    const user = token ? SESSIONS[token] : undefined;

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak valid atau telah berakhir',
      });
    }

    request.user = user;
    const decision = evaluateAccess(user.role, permission);
    if (!decision.allowed) {
      if (decision.statusCode === 401) {
        throw new UnauthorizedException({
          code: decision.code,
          message: 'Sesi tidak valid',
        });
      }
      throw new ForbiddenException({
        code: decision.code,
        message: 'Peran Anda tidak memiliki izin untuk tindakan ini',
      });
    }

    return true;
  }
}
