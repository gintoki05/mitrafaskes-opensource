import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@mitrafaskes/shared';
import { SessionPermissionGuard } from '../auth/session-permission.guard';
import { IntegrationGatewayController } from './integration-gateway.controller';

function contextFor(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- prototype method metadata is the subject under test.
  handler: Function,
  authorization?: string,
) {
  const request = {
    headers: authorization ? { authorization } : {},
  };
  return {
    // Metadata is attached to the prototype method; the guard only inspects it.
    getHandler: () => handler,
    getClass: () => IntegrationGatewayController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

function contextForSync(authorization?: string) {
  return contextFor(IntegrationGatewayController.prototype.sync, authorization);
}

function contextForRetry(authorization?: string) {
  return contextFor(
    IntegrationGatewayController.prototype.retryLog,
    authorization,
  );
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
    expect(
      guard.canActivate(contextForSync('Bearer mock-jwt-token-perawat_ani')),
    ).toBe(true);
  });

  it('protects the operator retry endpoint with sync.retry', () => {
    expect(() =>
      guard.canActivate(contextForRetry('Bearer mock-jwt-token-dr_budi')),
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(contextForRetry('Bearer mock-jwt-token-perawat_ani')),
    ).toBe(true);
  });
});

describe('IntegrationGatewayController retry payload visibility', () => {
  it('keeps raw retry payloads limited to Admin while allowing Perawat retry', async () => {
    const retryLog = jest.fn().mockResolvedValue({ ok: true });
    const controller = new IntegrationGatewayController({ retryLog } as never);

    await controller.retryLog('SATUSEHAT', 'log-perawat', {
      user: {
        id: 'usr-perawat_ani',
        username: 'perawat_ani',
        role: UserRole.PERAWAT,
      },
    });
    await controller.retryLog('SATUSEHAT', 'log-admin', {
      user: { id: 'usr-admin', username: 'admin', role: UserRole.ADMIN },
    });

    expect(retryLog).toHaveBeenNthCalledWith(1, 'SATUSEHAT', 'log-perawat', {
      includePayload: false,
    });
    expect(retryLog).toHaveBeenNthCalledWith(2, 'SATUSEHAT', 'log-admin', {
      includePayload: true,
    });
  });
});

describe('IntegrationGatewayController resource payload visibility', () => {
  it('redacts raw preview and sync payloads for non-Admin operators', async () => {
    const preview = jest.fn().mockResolvedValue({
      operation: 'CREATE',
      payload: {
        resourceType: 'Condition',
        subject: { reference: 'Patient/P1' },
      },
    });
    const sync = jest.fn().mockResolvedValue({
      syncedRemotely: true,
      payload: { resourceType: 'Condition', code: { coding: [] } },
      response: { resourceType: 'Condition', id: 'condition-1' },
    });
    const controller = new IntegrationGatewayController({
      getResourceHandler: jest.fn().mockReturnValue({
        resourceType: 'Condition',
        preview,
        sync,
      }),
    } as never);

    const perawat = {
      user: {
        id: 'usr-perawat_ani',
        username: 'perawat_ani',
        role: UserRole.PERAWAT,
      },
    };
    const admin = {
      user: { id: 'usr-admin', username: 'admin', role: UserRole.ADMIN },
    };

    await expect(
      controller.preview('SATUSEHAT', 'Condition', 'diagnosis-1', perawat),
    ).resolves.toEqual({ operation: 'CREATE' });
    await expect(
      controller.sync('SATUSEHAT', 'Condition', 'diagnosis-1', perawat),
    ).resolves.toEqual({ syncedRemotely: true });
    await expect(
      controller.preview('SATUSEHAT', 'Condition', 'diagnosis-1', admin),
    ).resolves.toEqual(
      expect.objectContaining({ payload: expect.any(Object) }),
    );
    await expect(
      controller.sync('SATUSEHAT', 'Condition', 'diagnosis-1', admin),
    ).resolves.toEqual(
      expect.objectContaining({
        payload: expect.any(Object),
        response: expect.any(Object),
      }),
    );
  });
});
