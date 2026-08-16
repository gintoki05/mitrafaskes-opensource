import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerLimitDetail } from '@nestjs/throttler';

export const AUTH_LOGIN_THROTTLE = {
  limit: 7,
  ttl: 7 * 60_000,
} as const;

function remainingMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

export function authThrottleErrorMessage(
  context: ExecutionContext,
  detail: ThrottlerLimitDetail,
): string {
  const controllerName = context.getClass().name;
  const handlerName = context.getHandler().name;

  if (
    controllerName === 'AuthController' &&
    (handlerName === 'login' || handlerName === 'token')
  ) {
    return `Batas percobaan login tercapai. Maksimal ${detail.limit} percobaan dalam ${Math.ceil(detail.ttl / 60_000)} menit. Coba lagi dalam sekitar ${remainingMinutes(detail.timeToBlockExpire)} menit.`;
  }

  return `Terlalu banyak permintaan. Coba lagi dalam sekitar ${remainingMinutes(detail.timeToBlockExpire)} menit.`;
}
