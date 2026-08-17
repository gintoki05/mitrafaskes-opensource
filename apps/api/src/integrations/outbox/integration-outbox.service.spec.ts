import {
  IntegrationOutboxDispatchScope,
  IntegrationOutboxStatus,
} from '@prisma/client';
import { IntegrationOutboxService } from './integration-outbox.service';

function event(
  overrides: Partial<{
    id: string;
    resourceType: string;
    resourceId: string;
    aggregateVersion: number;
    operation: string;
    dispatchScope: IntegrationOutboxDispatchScope;
    status: IntegrationOutboxStatus;
    attempt: number;
    nextAttemptAt: Date;
    createdAt: Date;
  }> = {},
) {
  return {
    id: 'outbox-1',
    resourceType: 'Encounter',
    resourceId: 'encounter-1',
    aggregateVersion: 2,
    operation: 'SYNC',
    dispatchScope: IntegrationOutboxDispatchScope.ALL_ENABLED,
    status: IntegrationOutboxStatus.PENDING,
    attempt: 1,
    nextAttemptAt: new Date('2026-08-17T00:00:00.000Z'),
    lockedAt: new Date('2026-08-17T00:00:00.000Z'),
    processedAt: null,
    errorMessage: null,
    createdAt: new Date('2026-08-17T00:00:00.000Z'),
    updatedAt: new Date('2026-08-17T00:00:00.000Z'),
    ...overrides,
  };
}

function serviceHarness(
  registeredHandlers: Array<{
    provider: string;
    handler: { sync?: jest.Mock };
  }>,
  currentEvent = event(),
) {
  const registry = {
    getRegisteredResourceHandlers: jest
      .fn()
      .mockReturnValue(registeredHandlers),
  };
  const updateMany = jest
    .fn()
    .mockResolvedValueOnce({ count: 0 })
    .mockResolvedValueOnce({ count: 1 });
  const prisma = {
    integrationOutboxEvent: {
      updateMany,
      findFirst: jest.fn().mockResolvedValue(currentEvent),
      findUnique: jest.fn().mockResolvedValue(currentEvent),
      update: jest.fn().mockResolvedValue(currentEvent),
    },
    externalResourceLink: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return {
    service: new IntegrationOutboxService(prisma as never, registry as never),
    prisma,
    registry,
    updateMany,
  };
}

describe('IntegrationOutboxService', () => {
  it('enqueues an Encounter event with an idempotent aggregate key', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const service = new IntegrationOutboxService({} as never, {} as never);
    const transaction = {
      integrationOutboxEvent: { upsert },
    };

    await service.enqueueEncounter(transaction as never, 'encounter-1', 4);

    expect(upsert).toHaveBeenCalledWith({
      where: {
        resourceType_resourceId_aggregateVersion_operation: {
          resourceType: 'Encounter',
          resourceId: 'encounter-1',
          aggregateVersion: 4,
          operation: 'SYNC',
        },
      },
      create: expect.objectContaining({
        resourceType: 'Encounter',
        resourceId: 'encounter-1',
        aggregateVersion: 4,
        operation: 'SYNC',
        dispatchScope: IntegrationOutboxDispatchScope.ALL_ENABLED,
      }),
      update: {},
    });
  });

  it('dispatches a pending event and marks it successful', async () => {
    const sync = jest.fn().mockResolvedValue({ syncLogId: 'sync-1' });
    const harness = serviceHarness([
      { provider: 'SATUSEHAT', handler: { sync } },
    ]);

    await harness.service.processPending();

    expect(sync).toHaveBeenCalledWith('encounter-1', { retryAttempt: 1 });
    expect(harness.prisma.integrationOutboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1' },
        data: expect.objectContaining({
          status: IntegrationOutboxStatus.SUCCESS,
          lockedAt: null,
          processedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('keeps a provider failure retryable and records the provider error', async () => {
    const sync = jest.fn().mockRejectedValue(new Error('Remote timeout'));
    const harness = serviceHarness([
      { provider: 'SATUSEHAT', handler: { sync } },
    ]);

    await harness.service.processPending();

    expect(harness.prisma.integrationOutboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: IntegrationOutboxStatus.FAILED,
          errorMessage: 'SATUSEHAT: Remote timeout',
          nextAttemptAt: expect.any(Date),
        }),
      }),
    );
  });

  it('skips entered-in-error correction when no linked provider exists', async () => {
    const sync = jest.fn();
    const harness = serviceHarness(
      [{ provider: 'SATUSEHAT', handler: { sync } }],
      event({ dispatchScope: IntegrationOutboxDispatchScope.LINKED_ONLY }),
    );

    await harness.service.processPending();

    expect(sync).not.toHaveBeenCalled();
    expect(harness.prisma.integrationOutboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: IntegrationOutboxStatus.SKIPPED,
          errorMessage:
            'Tidak ada linkage provider untuk koreksi Encounter ini.',
        }),
      }),
    );
  });
});
