import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessPermission, evaluateAccess } from '@mitrafaskes/shared';
import {
  ACCESS_PERMISSION_KEY,
  IS_PUBLIC_KEY,
} from './access-control.decorator';
import { AuthenticatedRequest } from './session.guard';

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
    if (!permission) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak valid atau telah berakhir',
      });
    }

    const decision = evaluateAccess(request.user.role, permission);
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
