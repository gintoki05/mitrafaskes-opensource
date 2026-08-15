import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UserRole, WorkProfileType } from '@mitrafaskes/shared';
import { AccessControlService } from './access-control.service';
import { IS_PUBLIC_KEY } from './access-control.decorator';
import { SessionService } from './session.service';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName?: string;
  role: UserRole;
  accessRole?: {
    id: string;
    code: string;
    name: string;
    defaultRoute: string;
    active: boolean;
    system: 'STANDARD' | 'SUPER_ADMIN';
  };
  permissions: string[];
  defaultRoute?: string;
  workProfileType?: WorkProfileType;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: string;
  sipNumber?: string;
  strNumber?: string;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  authSessionId?: string;
  authToken?: string;
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly access: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.sessions.extractToken(request);
    const session = token ? await this.sessions.findActive(token) : null;

    if (!session) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak valid atau telah berakhir',
      });
    }

    request.user = {
      id: session.user.id,
      username: session.user.username,
      fullName: session.user.fullName,
      role: session.user.role as UserRole,
      accessRole: this.access.toRoleSummary(session.user.accessRole),
      permissions: this.access.permissionCodes(session.user.accessRole),
      defaultRoute: session.user.accessRole?.defaultRoute ?? undefined,
      workProfileType: (session.user.workProfileType ??
        this.access.workProfileForLegacyRole(
          session.user.role as UserRole,
        )) as unknown as WorkProfileType,
      mustChangePassword: session.user.mustChangePassword,
      temporaryPasswordExpiresAt:
        session.user.temporaryPasswordExpiresAt?.toISOString(),
      sipNumber: session.user.sipNumber ?? undefined,
      strNumber: session.user.strNumber ?? undefined,
    };
    request.authSessionId = session.id;
    request.authToken = token;
    return true;
  }
}
