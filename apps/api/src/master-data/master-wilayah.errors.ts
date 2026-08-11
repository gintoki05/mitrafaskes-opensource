import { HttpException } from '@nestjs/common';
import { MasterDataProviderError } from './master-wilayah.provider';
import { MasterRegionValidationError } from './master-wilayah.validation';

export interface MasterWilayahRefreshFailure {
  code: string;
  message: string;
  httpStatus: number;
}

const GENERIC_REFRESH_FAILURE =
  'Refresh Master Wilayah gagal; data lokal tidak diubah';
const TRANSACTION_EXPIRED_FAILURE =
  'Import Master Wilayah terlalu lama untuk satu transaksi database; data lokal tidak diubah. Coba lagi setelah backend memuat perbaikan import bulk.';
const DATABASE_FAILURE =
  'Import Master Wilayah gagal pada database lokal; data lokal tidak diubah. Periksa log API sebelum mencoba lagi.';

export function toMasterWilayahRefreshFailure(
  error: unknown,
): MasterWilayahRefreshFailure {
  if (error instanceof MasterDataProviderError) {
    return {
      code: error.code,
      message: redactErrorMessage(error.message),
      httpStatus: error.httpStatus,
    };
  }

  if (isProviderError(error)) {
    return {
      code: error.code,
      message: redactErrorMessage(error.message),
      httpStatus: error.httpStatus || 503,
    };
  }

  if (error instanceof MasterRegionValidationError) {
    return {
      code: 'MASTER_DATA_VALIDATION_FAILED',
      message: redactErrorMessage(error.message),
      httpStatus: 422,
    };
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    const code = readResponseCode(response);
    return {
      code: code || 'MASTER_DATA_REFRESH_FAILED',
      message: toSafeMasterWilayahErrorMessage(
        readResponseMessage(response) || GENERIC_REFRESH_FAILURE,
        code,
      ),
      httpStatus: error.getStatus(),
    };
  }

  const databaseErrorCode = readErrorCode(error);
  if (
    error instanceof Error &&
    (isExpiredTransactionError(error.message) || databaseErrorCode === 'P2028')
  ) {
    return {
      code: 'MASTER_DATA_IMPORT_TRANSACTION_EXPIRED',
      message: TRANSACTION_EXPIRED_FAILURE,
      httpStatus: 503,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'MASTER_DATA_IMPORT_DATABASE_ERROR',
      message: formatDatabaseFailure(databaseErrorCode),
      httpStatus: 500,
    };
  }

  return {
    code: 'MASTER_DATA_REFRESH_FAILED',
    message: GENERIC_REFRESH_FAILURE,
    httpStatus: 500,
  };
}

function isProviderError(
  error: unknown,
): error is { code: string; message: string; httpStatus?: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

export function toSafeMasterWilayahErrorMessage(
  message: string,
  code?: string,
): string {
  if (
    code === 'MASTER_DATA_IMPORT_TRANSACTION_EXPIRED' ||
    isExpiredTransactionError(message)
  ) {
    return TRANSACTION_EXPIRED_FAILURE;
  }

  if (code === 'MASTER_DATA_IMPORT_DATABASE_ERROR') {
    return DATABASE_FAILURE;
  }

  return redactErrorMessage(message);
}

function readResponseCode(response: string | object): string | undefined {
  if (!isRecord(response)) return undefined;
  return typeof response.code === 'string' && response.code.trim()
    ? response.code.trim()
    : undefined;
}

function readResponseMessage(response: string | object): string | undefined {
  if (typeof response === 'string' && response.trim()) return response.trim();
  if (!isRecord(response)) return undefined;

  if (Array.isArray(response.message)) {
    const message = response.message.filter(
      (item): item is string =>
        typeof item === 'string' && Boolean(item.trim()),
    );
    return message.length > 0 ? message.join(' ') : undefined;
  }

  return typeof response.message === 'string' && response.message.trim()
    ? response.message.trim()
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.code === 'string' && error.code.trim()
    ? error.code.trim()
    : undefined;
}

function formatDatabaseFailure(errorCode?: string): string {
  return errorCode
    ? `${DATABASE_FAILURE} Kode database: ${errorCode}.`
    : DATABASE_FAILURE;
}

function isExpiredTransactionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('transaction api error') &&
    (normalized.includes('transaction not found') ||
      normalized.includes('transaction already closed') ||
      normalized.includes('transaction expired'))
  );
}

function redactErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(
      /(client[_-]?secret|client[_-]?id|access[_-]?token|authorization)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]',
    )
    .slice(0, 500);
}
