import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessPermission } from '@mitrafaskes/shared';
import {
  ACCESS_PERMISSION_KEY,
  IS_PUBLIC_KEY,
} from './access-control.decorator';
import { AuthenticatedRequest } from './session.guard';
import { hasAuthenticatedPermission } from './access-control.service';

@Injectable()
export class PermissionGuard implements CanActivate {
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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak valid atau telah berakhir',
      });
    }

    const requestPath = request.path || request.originalUrl || '';
    if (
      request.user.mustChangePassword &&
      !requestPath.endsWith('/auth/me') &&
      !requestPath.endsWith('/auth/logout') &&
      !requestPath.endsWith('/auth/logout-all') &&
      !requestPath.endsWith('/auth/change-password')
    ) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password sementara harus diganti sebelum melanjutkan',
      });
    }

    if (!permission) return true;

    if (!hasAuthenticatedPermission(request.user, permission)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Peran Anda tidak memiliki izin untuk tindakan ini',
      });
    }

    return true;
  }
}
