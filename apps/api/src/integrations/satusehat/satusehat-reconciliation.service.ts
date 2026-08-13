import { Injectable } from '@nestjs/common';
import type { IntegrationReconciliationResponse } from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';

const PROVIDER = 'SATUSEHAT';

type ReconciliationLog = {
  resourceType: string;
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  satusehatId: string | null;
  updatedAt: Date;
  payload: unknown;
};

@Injectable()
export class SatusehatReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async reconcile(
    environment: string,
  ): Promise<IntegrationReconciliationResponse> {
    const checkedAt = new Date().toISOString();
    const [links, logs] = await Promise.all([
      this.prisma.externalResourceLink.findMany({
        where: { provider: PROVIDER, environment },
        select: {
          resourceType: true,
          localResourceId: true,
          externalResourceId: true,
        },
      }),
      this.prisma.satusehatSyncLog.findMany({
        orderBy: { updatedAt: 'desc' },
        select: {
          resourceType: true,
          resourceId: true,
          status: true,
          satusehatId: true,
          updatedAt: true,
          payload: true,
        },
      }),
    ]);

    const scopedLogs = logs.filter((log) =>
      this.logMatchesEnvironment(log.payload, environment),
    );
    const linkByResource = new Map(
      links.map((link) => [
        this.reconciliationKey(link.resourceType, link.localResourceId),
        link,
      ]),
    );
    const successByResource = new Map<string, ReconciliationLog>();
    const issues: IntegrationReconciliationResponse['issues'] = [];

    for (const log of scopedLogs) {
      const key = this.reconciliationKey(log.resourceType, log.resourceId);
      if (log.status === 'SUCCESS' && !successByResource.has(key)) {
        successByResource.set(key, log);
      }
      if (
        log.status === 'PENDING' &&
        Date.now() - log.updatedAt.getTime() >= this.readPendingLogTimeoutMs()
      ) {
        issues.push({
          code: 'STALE_PENDING_LOG',
          severity: 'WARNING',
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          message: 'Log PENDING tidak berubah melewati batas waktu monitoring.',
        });
      }
    }

    for (const link of links) {
      const key = this.reconciliationKey(link.resourceType, link.localResourceId);
      const success = successByResource.get(key);
      if (!success) {
        issues.push({
          code: 'LINKAGE_WITHOUT_SUCCESS_LOG',
          severity: 'WARNING',
          resourceType: link.resourceType,
          resourceId: link.localResourceId,
          externalResourceId: link.externalResourceId,
          message: 'Linkage tersimpan tetapi tidak ditemukan log SUCCESS yang sesuai.',
        });
        continue;
      }
      if (
        success.satusehatId &&
        success.satusehatId !== link.externalResourceId
      ) {
        issues.push({
          code: 'SUCCESS_LOG_LINKAGE_MISMATCH',
          severity: 'ERROR',
          resourceType: link.resourceType,
          resourceId: link.localResourceId,
          externalResourceId: link.externalResourceId,
          message: 'ID remote pada log SUCCESS berbeda dari linkage tersimpan.',
        });
      }
    }

    for (const success of successByResource.values()) {
      const key = this.reconciliationKey(success.resourceType, success.resourceId);
      if (linkByResource.has(key)) continue;
      issues.push({
        code: 'SUCCESS_LOG_WITHOUT_LINKAGE',
        severity: 'ERROR',
        resourceType: success.resourceType,
        resourceId: success.resourceId,
        externalResourceId: success.satusehatId ?? undefined,
        message: 'Log SUCCESS tidak memiliki ExternalResourceLink yang sesuai.',
      });
    }

    return {
      provider: PROVIDER,
      environment,
      checkedAt,
      checkedLinks: links.length,
      checkedLogs: scopedLogs.length,
      issues,
    };
  }

  private reconciliationKey(resourceType: string, resourceId: string): string {
    return `${resourceType}\u0000${resourceId}`;
  }

  private logMatchesEnvironment(payload: unknown, environment: string): boolean {
    const record = this.isRecord(payload) ? payload : undefined;
    const metadata =
      record && this.isRecord(record.metadata) ? record.metadata : undefined;
    const logEnvironment = metadata?.environment;
    return typeof logEnvironment !== 'string' || logEnvironment === environment;
  }

  private readPendingLogTimeoutMs(): number {
    const configured = Number(process.env.SATUSEHAT_PENDING_LOG_TIMEOUT_MS);
    return Number.isInteger(configured) && configured > 0
      ? configured
      : 15 * 60 * 1000;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
