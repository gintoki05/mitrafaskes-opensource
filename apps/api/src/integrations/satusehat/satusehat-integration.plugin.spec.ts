/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers intentionally return any in this isolated unit test. */
import { ConflictException, HttpException } from '@nestjs/common';
import { SatusehatIntegrationPlugin } from './satusehat-integration.plugin';

function buildPlugin(
  input: {
    encounters?: { previewEncounter: jest.Mock; syncEncounter: jest.Mock };
    reconciliation?: { reconcile: jest.Mock };
    prisma?: unknown;
  } = {},
) {
  const unused = {} as never;
  return new SatusehatIntegrationPlugin(
    { register: jest.fn() } as never,
    unused,
    (input.prisma ?? {}) as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    (input.encounters ?? {
      previewEncounter: jest.fn(),
      syncEncounter: jest.fn(),
    }) as never,
    (input.reconciliation ?? { reconcile: jest.fn() }) as never,
    unused,
  );
}

describe('SatusehatIntegrationPlugin Encounter handler', () => {
  it('registers preview and sync through the generic resource handler', async () => {
    const previewEncounter = jest
      .fn()
      .mockResolvedValue({ operation: 'CREATE' });
    const syncEncounter = jest.fn().mockResolvedValue({ syncedRemotely: true });
    const encounters = { previewEncounter, syncEncounter };
    const plugin = buildPlugin({ encounters });
    const handler = plugin.getResourceHandler('Encounter');

    await expect(handler?.preview?.('enc-local-1')).resolves.toEqual({
      operation: 'CREATE',
    });
    await expect(handler?.sync?.('enc-local-1')).resolves.toEqual({
      syncedRemotely: true,
    });
    expect(previewEncounter).toHaveBeenCalledWith('enc-local-1');
    expect(syncEncounter).toHaveBeenCalledWith('enc-local-1');
  });

  it('exposes only Encounter log state from the active environment', async () => {
    const prisma = {
      externalResourceLink: {
        findMany: jest.fn().mockResolvedValue([
          {
            localResourceId: 'enc-local-1',
            externalResourceId: 'enc-remote-1',
            lastSyncedAt: new Date('2026-08-13T10:00:00.000Z'),
          },
        ]),
      },
      satusehatSyncLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            resourceId: 'enc-local-1',
            status: 'FAILED',
            errorMessage: 'production failure',
            updatedAt: new Date('2026-08-13T11:00:00.000Z'),
            payload: { metadata: { environment: 'production' } },
          },
          {
            resourceId: 'enc-local-1',
            status: 'SUCCESS',
            errorMessage: null,
            updatedAt: new Date('2026-08-13T10:00:00.000Z'),
            payload: { metadata: { environment: 'sandbox' } },
          },
        ]),
      },
    };
    const plugin = buildPlugin({ prisma });

    const summaries = await plugin.getResourceSummaries('Encounter', [
      'enc-local-1',
    ]);

    expect(summaries.get('enc-local-1')).toEqual([
      expect.objectContaining({
        environment: 'sandbox',
        linkage: expect.objectContaining({
          externalResourceId: 'enc-remote-1',
        }),
        latestSync: expect.objectContaining({ status: 'SUCCESS' }),
      }),
    ]);
  });

  it('retries a failed resource through its handler with the local id and preserves audit ownership', async () => {
    const failedLog = {
      id: 'sync-failed-1',
      resourceType: 'Encounter',
      resourceId: 'enc-local-1',
      status: 'FAILED' as const,
      satusehatId: null,
      errorMessage: 'Request timeout',
      updatedAt: new Date('2026-08-13T10:00:00.000Z'),
      payload: {
        metadata: {
          environment: 'sandbox',
          retryable: true,
          errorCategory: 'TRANSIENT',
          operatorAction: 'RETRY_WITH_BACKOFF',
          retryAttempt: 0,
        },
      },
    };
    const retriedLog = {
      ...failedLog,
      id: 'sync-retry-1',
      status: 'SUCCESS' as const,
      satusehatId: 'remote-1',
      errorMessage: null,
      updatedAt: new Date('2026-08-13T10:01:00.000Z'),
      payload: { metadata: { environment: 'sandbox', retryAttempt: 1 } },
    };
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(failedLog)
      .mockResolvedValueOnce(retriedLog);
    const syncEncounter = jest.fn().mockResolvedValue({
      syncedRemotely: true,
      syncLogId: retriedLog.id,
    });
    const plugin = buildPlugin({
      encounters: { previewEncounter: jest.fn(), syncEncounter },
      prisma: { satusehatSyncLog: { findUnique } },
    });

    const result = await plugin.retryLog('sync-failed-1');

    expect(syncEncounter).toHaveBeenCalledWith('enc-local-1', {
      retryAttempt: 1,
      retryOfLogId: 'sync-failed-1',
    });
    expect(result).toEqual({
      message: expect.stringContaining('handler resource'),
      sourceLogId: 'sync-failed-1',
      log: expect.objectContaining({
        id: 'sync-retry-1',
        status: 'SUCCESS',
      }),
    });
    expect((result as { log: { payload?: unknown } }).log).not.toHaveProperty(
      'payload',
    );
  });

  it('blocks a non-retryable failure and never synthesizes success', async () => {
    const syncEncounter = jest.fn();
    const findUnique = jest.fn().mockResolvedValue({
      id: 'sync-validation-1',
      resourceType: 'Encounter',
      resourceId: 'enc-local-1',
      status: 'FAILED',
      satusehatId: null,
      errorMessage: 'Payload invalid',
      updatedAt: new Date('2026-08-13T10:00:00.000Z'),
      payload: {
        metadata: {
          environment: 'sandbox',
          retryable: false,
          errorCategory: 'VALIDATION',
          operatorAction: 'FIX_PAYLOAD',
        },
      },
    });
    const plugin = buildPlugin({
      encounters: { previewEncounter: jest.fn(), syncEncounter },
      prisma: { satusehatSyncLog: { findUnique } },
    });

    await expect(plugin.retryLog('sync-validation-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(syncEncounter).not.toHaveBeenCalled();
  });

  it('rejects a handler result without a new audit log instead of returning success', async () => {
    const syncEncounter = jest
      .fn()
      .mockResolvedValue({ syncedRemotely: true });
    const findUnique = jest.fn().mockResolvedValue({
      id: 'sync-without-audit-1',
      resourceType: 'Encounter',
      resourceId: 'enc-local-1',
      status: 'FAILED',
      satusehatId: null,
      errorMessage: 'Request timeout',
      updatedAt: new Date('2026-08-13T10:00:00.000Z'),
      payload: {
        metadata: {
          environment: 'sandbox',
          retryable: true,
          errorCategory: 'TRANSIENT',
          operatorAction: 'RETRY_WITH_BACKOFF',
        },
      },
    });
    const plugin = buildPlugin({
      encounters: { previewEncounter: jest.fn(), syncEncounter },
      prisma: { satusehatSyncLog: { findUnique } },
    });

    await expect(plugin.retryLog('sync-without-audit-1')).rejects.toMatchObject({
      status: 502,
      response: expect.objectContaining({ code: 'SYNC_RETRY_AUDIT_MISSING' }),
    });
  });

  it('returns HTTP 429 while a retryable log is inside persisted backoff', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'sync-backoff-1',
      resourceType: 'Encounter',
      resourceId: 'enc-local-1',
      status: 'FAILED',
      satusehatId: null,
      errorMessage: 'Temporary outage',
      updatedAt: new Date('2026-08-13T10:00:00.000Z'),
      payload: {
        metadata: {
          environment: 'sandbox',
          retryable: true,
          errorCategory: 'TRANSIENT',
          operatorAction: 'RETRY_WITH_BACKOFF',
          retryAfterAt: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    });
    const plugin = buildPlugin({ prisma: { satusehatSyncLog: { findUnique } } });

    try {
      await plugin.retryLog('sync-backoff-1');
      throw new Error('expected backoff error');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ code: 'SATUSEHAT_SYNC_RETRY_BACKOFF' }),
      );
    }
  });

  it('reports linkage/log inconsistencies without deleting linkage', async () => {
    const externalResourceLink = {
      findMany: jest.fn().mockResolvedValue([
        {
          resourceType: 'Encounter',
          localResourceId: 'enc-local-1',
          externalResourceId: 'remote-link-1',
        },
      ]),
    };
    const satusehatSyncLog = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'sync-success-1',
          resourceType: 'Encounter',
          resourceId: 'enc-local-1',
          status: 'SUCCESS',
          satusehatId: 'remote-log-1',
          updatedAt: new Date('2026-08-13T10:00:00.000Z'),
          payload: { metadata: { environment: 'sandbox' } },
        },
      ]),
    };
    const plugin = buildPlugin({
      prisma: { externalResourceLink, satusehatSyncLog },
      reconciliation: {
        reconcile: jest.fn().mockResolvedValue({
          provider: 'SATUSEHAT',
          environment: 'sandbox',
          checkedAt: '2026-08-13T10:00:00.000Z',
          checkedLinks: 1,
          checkedLogs: 1,
          issues: [],
        }),
      },
    });

    await expect(plugin.reconcile()).resolves.toEqual(
      expect.objectContaining({ checkedLinks: 1, checkedLogs: 1, issues: [] }),
    );
    expect(
      (plugin as unknown as { reconciliation: { reconcile: jest.Mock } })
        .reconciliation.reconcile,
    ).toHaveBeenCalledWith('sandbox');
    expect(externalResourceLink.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ delete: expect.anything() }),
    );
  });
});
