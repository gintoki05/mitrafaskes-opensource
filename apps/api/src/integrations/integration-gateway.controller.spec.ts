import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@mitrafaskes/shared';
import { PermissionGuard } from '../auth/permission.guard';
import { IntegrationGatewayController } from './integration-gateway.controller';

function contextFor(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- prototype method metadata is the subject under test.
  handler: Function,
  role?: UserRole,
) {
  const request = {
    headers: {},
    user: role
      ? { id: `usr-${role.toLowerCase()}`, username: role, role }
      : undefined,
  };
  return {
    // Metadata is attached to the prototype method; the guard only inspects it.
    getHandler: () => handler,
    getClass: () => IntegrationGatewayController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

function contextForSync(role?: UserRole) {
  return contextFor(IntegrationGatewayController.prototype.sync, role);
}

function contextForRetry(role?: UserRole) {
  return contextFor(IntegrationGatewayController.prototype.retryLog, role);
}

function contextForConnectionStatus(role?: UserRole) {
  return contextFor(
    IntegrationGatewayController.prototype.getConnectionStatus,
    role,
  );
}

describe('IntegrationGatewayController connection status permission', () => {
  const guard = new PermissionGuard(new Reflector());

  it('requires an authenticated session but not the integration permission', () => {
    expect(() => guard.canActivate(contextForConnectionStatus())).toThrow(
      UnauthorizedException,
    );
    expect(
      guard.canActivate(contextForConnectionStatus(UserRole.DOKTER)),
    ).toBe(true);
    expect(
      guard.canActivate(contextForConnectionStatus(UserRole.PERAWAT)),
    ).toBe(true);
  });
});

describe('IntegrationGatewayController sync permission', () => {
  const guard = new PermissionGuard(new Reflector());

  it('rejects an unauthenticated sync request', () => {
    expect(() => guard.canActivate(contextForSync())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a doctor without the sync.retry permission', () => {
    expect(() => guard.canActivate(contextForSync(UserRole.DOKTER))).toThrow(
      ForbiddenException,
    );
  });

  it('allows an authorized integration operator', () => {
    expect(guard.canActivate(contextForSync(UserRole.ADMIN))).toBe(true);
    expect(
      guard.canActivate(contextForSync(UserRole.PETUGAS_PENDAFTARAN)),
    ).toBe(true);
  });

  it('protects the operator retry endpoint with sync.retry', () => {
    expect(() => guard.canActivate(contextForRetry(UserRole.DOKTER))).toThrow(
      ForbiddenException,
    );
    expect(
      guard.canActivate(contextForRetry(UserRole.PETUGAS_PENDAFTARAN)),
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
        role: UserRole.PETUGAS_PENDAFTARAN,
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
        role: UserRole.PETUGAS_PENDAFTARAN,
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
