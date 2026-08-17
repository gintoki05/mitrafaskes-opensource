import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import {
  IntegrationOutboxDispatchScope,
  IntegrationOutboxStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationRegistry } from '../integration-registry';

const OUTBOX_OPERATION_SYNC = 'SYNC';
const MAX_AUTOMATIC_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 15_000;
const STALE_PROCESSING_MS = 5 * 60_000;

export type EncounterOutboxScope = IntegrationOutboxDispatchScope;

export type OutboxTransaction = Prisma.TransactionClient;

@Injectable()
export class IntegrationOutboxService
  implements OnModuleInit, OnApplicationShutdown
{
  private poller?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: IntegrationRegistry,
  ) {}

  onModuleInit(): void {
    this.poller = setInterval(() => {
      void this.processPending();
    }, POLL_INTERVAL_MS);
    this.poller.unref?.();
  }

  onApplicationShutdown(): void {
    if (this.poller) clearInterval(this.poller);
  }

  async enqueueEncounter(
    transaction: OutboxTransaction,
    resourceId: string,
    aggregateVersion: number,
    dispatchScope: EncounterOutboxScope = IntegrationOutboxDispatchScope.ALL_ENABLED,
  ): Promise<void> {
    await transaction.integrationOutboxEvent.upsert({
      where: {
        resourceType_resourceId_aggregateVersion_operation: {
          resourceType: 'Encounter',
          resourceId,
          aggregateVersion,
          operation: OUTBOX_OPERATION_SYNC,
        },
      },
      create: {
        id: randomUUID(),
        resourceType: 'Encounter',
        resourceId,
        aggregateVersion,
        operation: OUTBOX_OPERATION_SYNC,
        dispatchScope,
      },
      update: {},
    });
  }

  async processPending(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.recoverStaleEvents();
      const event = await this.claimNextEvent();
      if (event) await this.dispatch(event);
    } finally {
      this.processing = false;
    }
  }

  private async recoverStaleEvents(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    await this.prisma.integrationOutboxEvent.updateMany({
      where: {
        status: IntegrationOutboxStatus.PROCESSING,
        lockedAt: { lt: staleBefore },
      },
      data: {
        status: IntegrationOutboxStatus.FAILED,
        nextAttemptAt: new Date(),
        errorMessage: 'Outbox worker sebelumnya berhenti sebelum selesai.',
      },
    });
  }

  private async claimNextEvent() {
    const now = new Date();
    const candidate = await this.prisma.integrationOutboxEvent.findFirst({
      where: {
        OR: [
          { status: IntegrationOutboxStatus.PENDING },
          {
            status: IntegrationOutboxStatus.FAILED,
            nextAttemptAt: { lte: now },
          },
        ],
        nextAttemptAt: { lte: now },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    });
    if (!candidate) return null;

    const claimed = await this.prisma.integrationOutboxEvent.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status,
        nextAttemptAt: { lte: now },
      },
      data: {
        status: IntegrationOutboxStatus.PROCESSING,
        attempt: { increment: 1 },
        lockedAt: now,
      },
    });
    if (claimed.count !== 1) return null;
    return this.prisma.integrationOutboxEvent.findUnique({
      where: { id: candidate.id },
    });
  }

  private async dispatch(
    event: NonNullable<
      Awaited<ReturnType<IntegrationOutboxService['claimNextEvent']>>
    >,
  ): Promise<void> {
    const registered = this.registry.getRegisteredResourceHandlers(
      event.resourceType,
    );
    const handlers =
      event.dispatchScope === IntegrationOutboxDispatchScope.LINKED_ONLY
        ? await this.linkedHandlers(
            event.resourceType,
            event.resourceId,
            registered,
          )
        : registered;

    const syncHandlers = handlers.filter(
      (entry) => entry.handler.sync !== undefined,
    );
    if (syncHandlers.length === 0) {
      await this.mark(event.id, IntegrationOutboxStatus.SKIPPED, {
        errorMessage:
          event.dispatchScope === IntegrationOutboxDispatchScope.LINKED_ONLY
            ? 'Tidak ada linkage provider untuk koreksi Encounter ini.'
            : 'Tidak ada integration provider aktif untuk resource ini.',
      });
      return;
    }

    const failures: string[] = [];
    for (const entry of syncHandlers) {
      try {
        await entry.handler.sync!(event.resourceId, {
          retryAttempt: event.attempt,
        });
      } catch (error) {
        failures.push(`${entry.provider}: ${this.errorMessage(error)}`);
      }
    }

    if (failures.length === 0) {
      await this.mark(event.id, IntegrationOutboxStatus.SUCCESS, {
        processedAt: new Date(),
      });
      return;
    }

    const terminal = event.attempt >= MAX_AUTOMATIC_ATTEMPTS;
    await this.mark(
      event.id,
      terminal
        ? IntegrationOutboxStatus.BLOCKED
        : IntegrationOutboxStatus.FAILED,
      {
        errorMessage: failures.join(' | ').slice(0, 1000),
        nextAttemptAt: terminal
          ? undefined
          : new Date(Date.now() + this.backoffMs(event.attempt)),
      },
    );
  }

  private async linkedHandlers(
    resourceType: string,
    resourceId: string,
    registered: ReturnType<
      IntegrationRegistry['getRegisteredResourceHandlers']
    >,
  ) {
    const links = await this.prisma.externalResourceLink.findMany({
      where: { localResourceType: resourceType, localResourceId: resourceId },
      select: { provider: true },
    });
    const providers = new Set(links.map((link) => link.provider.toUpperCase()));
    return registered.filter((entry) =>
      providers.has(entry.provider.toUpperCase()),
    );
  }

  private async mark(
    id: string,
    status: IntegrationOutboxStatus,
    data: {
      errorMessage?: string;
      nextAttemptAt?: Date;
      processedAt?: Date;
    },
  ): Promise<void> {
    await this.prisma.integrationOutboxEvent.update({
      where: { id },
      data: {
        status,
        lockedAt: null,
        errorMessage: data.errorMessage ?? null,
        nextAttemptAt: data.nextAttemptAt,
        processedAt: data.processedAt,
      },
    });
  }

  private backoffMs(attempt: number): number {
    return Math.min(60 * 60_000, 1_000 * 2 ** Math.max(0, attempt - 1));
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 500);
    return 'Sinkronisasi provider gagal.';
  }
}
