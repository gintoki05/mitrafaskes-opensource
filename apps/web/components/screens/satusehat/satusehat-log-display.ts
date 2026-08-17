import type {
  IntegrationFailureCategory,
  IntegrationLog,
  IntegrationOperatorAction,
} from '@mitrafaskes/shared';

const categoryLabels: Record<IntegrationFailureCategory, string> = {
  AUTH: 'Otentikasi',
  RATE_LIMIT: 'Rate limit',
  TRANSIENT: 'Gangguan sementara',
  VALIDATION: 'Validasi payload',
  DUPLICATE: 'Duplikasi/konflik',
  REFERENCE_MISSING: 'Dependency/reference',
  TERMINOLOGY: 'Terminologi',
  CONFIGURATION: 'Konfigurasi',
  UNKNOWN: 'Perlu investigasi',
};

const operatorActionLabels: Record<IntegrationOperatorAction, string> = {
  CHECK_CREDENTIALS: 'Periksa kredensial',
  RETRY_WITH_BACKOFF: 'Retry setelah backoff',
  RECONCILE: 'Rekonsiliasi remote',
  FIX_REFERENCE: 'Hubungkan dependency',
  FIX_TERMINOLOGY: 'Perbaiki terminologi',
  FIX_PAYLOAD: 'Perbaiki payload',
  CHECK_CONFIGURATION: 'Periksa konfigurasi',
  INVESTIGATE: 'Investigasi operator',
};

export function failureCategoryLabel(
  category: IntegrationFailureCategory | undefined,
): string {
  return category ? categoryLabels[category] : 'Belum diklasifikasikan';
}

export function operatorActionLabel(
  action: IntegrationOperatorAction | undefined,
): string {
  return action ? operatorActionLabels[action] : 'Periksa log';
}

export function retryAvailable(log: IntegrationLog, now = Date.now()): boolean {
  if (log.status !== 'FAILED' || log.retryable !== true) return false;
  if (!log.retryAfterAt) return true;
  const retryAt = Date.parse(log.retryAfterAt);
  return Number.isNaN(retryAt) || retryAt <= now;
}

export function retryAfterLabel(
  retryAfterAt: string | undefined,
  now = Date.now(),
): string | undefined {
  if (!retryAfterAt) return undefined;
  const timestamp = Date.parse(retryAfterAt);
  if (Number.isNaN(timestamp)) return undefined;
  if (timestamp <= now) return 'Retry tersedia sekarang';
  return `Retry tersedia setelah ${new Date(timestamp).toLocaleString('id-ID')}`;
}

export function backoffLabel(backoffMs: number | undefined): string | undefined {
  if (typeof backoffMs !== 'number' || !Number.isFinite(backoffMs) || backoffMs <= 0) {
    return undefined;
  }
  const seconds = Math.ceil(backoffMs / 1000);
  if (seconds < 60) return `Backoff ${seconds} detik`;
  const minutes = Math.ceil(seconds / 60);
  return `Backoff ${minutes} menit`;
}
