/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers intentionally return any in this isolated unit test. */
import { SatusehatIntegrationPlugin } from './satusehat-integration.plugin';

function buildPlugin(
  input: {
    encounters?: { previewEncounter: jest.Mock; syncEncounter: jest.Mock };
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
});
