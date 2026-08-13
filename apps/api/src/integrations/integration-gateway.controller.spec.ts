import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionPermissionGuard } from '../auth/session-permission.guard';
import { IntegrationGatewayController } from './integration-gateway.controller';

function contextForSync(authorization?: string) {
  const request = {
    headers: authorization ? { authorization } : {},
  };
  return {
    // Metadata is attached to the prototype method; the guard only inspects it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    getHandler: () => IntegrationGatewayController.prototype.sync,
    getClass: () => IntegrationGatewayController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe('IntegrationGatewayController sync permission', () => {
  const guard = new SessionPermissionGuard(new Reflector());

  it('rejects an unauthenticated sync request', () => {
    expect(() => guard.canActivate(contextForSync())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a doctor without the sync.retry permission', () => {
    expect(() =>
      guard.canActivate(contextForSync('Bearer mock-jwt-token-dr_budi')),
    ).toThrow(ForbiddenException);
  });

  it('allows an authorized integration operator', () => {
    expect(
      guard.canActivate(contextForSync('Bearer mock-jwt-token-admin')),
    ).toBe(true);
  });
});
