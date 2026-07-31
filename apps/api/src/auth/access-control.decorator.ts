import { SetMetadata } from '@nestjs/common';
import { AccessPermission } from '@mitrafaskes/shared';

export const ACCESS_PERMISSION_KEY = 'accessPermission';
export const IS_PUBLIC_KEY = 'isPublic';

export const RequirePermission = (permission: AccessPermission) =>
  SetMetadata(ACCESS_PERMISSION_KEY, permission);

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
