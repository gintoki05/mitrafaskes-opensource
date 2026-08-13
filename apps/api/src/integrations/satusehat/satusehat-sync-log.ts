import { HttpException } from '@nestjs/common';
import type {
  IntegrationFailureCategory,
  IntegrationOperatorAction,
} from '@mitrafaskes/shared';
import type { IntegrationSyncContext } from '../integration.types';
import {
  classifySatusehatFhirFailure,
  type SatusehatFhirErrorClassification,
} from './satusehat-fhir-error-classification';
import { SatusehatFhirError } from './satusehat-fhir.client';

const DEFAULT_RETRY_BASE_DELAY_MS = 30_000;
const MAX_RETRY_BACKOFF_MS = 15 * 60 * 1000;

export interface SatusehatSyncLogFailureMetadata {
  errorCode: string;
  errorCategory: IntegrationFailureCategory;
  retryable: boolean;
  operatorAction: IntegrationOperatorAction;
  retryAttempt: number;
  httpStatus?: number;
  retryAfterAt?: string;
  backoffMs?: number;
}

export interface SatusehatStoredFailureMetadata {
  errorCode?: string;
  errorCategory?: IntegrationFailureCategory;
  retryable?: boolean;
  operatorAction?: IntegrationOperatorAction;
  retryAttempt?: number;
  httpStatus?: number;
  retryAfterAt?: string;
  backoffMs?: number;
}

export function retryAttemptFromContext(
  context?: IntegrationSyncContext,
): number {
  const attempt = context?.retryAttempt ?? 0;
  return Number.isInteger(attempt) && attempt >= 0 ? attempt : 0;
}

export function addSatusehatSyncMetadata(
  payload: unknown,
  metadata: Record<string, unknown>,
): unknown {
  if (isRecord(payload)) {
    const currentMetadata = isRecord(payload.metadata) ? payload.metadata : {};
    return {
      ...payload,
      metadata: { ...currentMetadata, ...metadata },
    };
  }

  return { metadata, resource: payload };
}

export function classifySatusehatSyncFailure(
  error: unknown,
  retryAttempt: number,
  now = new Date(),
): SatusehatSyncLogFailureMetadata {
  const details = readFailureDetails(error);
  const backoffMs = details.classification.retryable
    ? calculateBackoffMs(retryAttempt, details.retryAfterSeconds)
    : undefined;
  const retryAfterAt = backoffMs
    ? new Date(now.getTime() + backoffMs).toISOString()
    : undefined;

  return {
    errorCode: details.code,
    errorCategory: details.classification.category,
    retryable: details.classification.retryable,
    operatorAction: details.classification.operatorAction,
    retryAttempt,
    ...(details.httpStatus === undefined
      ? {}
      : { httpStatus: details.httpStatus }),
    ...(retryAfterAt ? { retryAfterAt } : {}),
    ...(backoffMs === undefined ? {} : { backoffMs }),
  };
}

export function readSatusehatFailureMetadata(
  payload: unknown,
): SatusehatStoredFailureMetadata {
  if (!isRecord(payload) || !isRecord(payload.metadata)) return {};
  const metadata = payload.metadata;
  const errorCode = readString(metadata.errorCode);
  const retryAfterAt = readString(metadata.retryAfterAt);
  const retryAttempt = readNonNegativeInteger(metadata.retryAttempt);
  const httpStatus = readPositiveInteger(metadata.httpStatus);
  const backoffMs = readNonNegativeInteger(metadata.backoffMs);
  return {
    ...(errorCode ? { errorCode } : {}),
    ...(isFailureCategory(metadata.errorCategory)
      ? { errorCategory: metadata.errorCategory }
      : {}),
    ...(typeof metadata.retryable === 'boolean'
      ? { retryable: metadata.retryable }
      : {}),
    ...(isOperatorAction(metadata.operatorAction)
      ? { operatorAction: metadata.operatorAction }
      : {}),
    ...(retryAttempt === undefined ? {} : { retryAttempt }),
    ...(httpStatus === undefined ? {} : { httpStatus }),
    ...(retryAfterAt ? { retryAfterAt } : {}),
    ...(backoffMs === undefined ? {} : { backoffMs }),
  };
}

export function readRetryAfterAt(payload: unknown): Date | undefined {
  const value = readSatusehatFailureMetadata(payload).retryAfterAt;
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
}

function readFailureDetails(error: unknown): {
  code: string;
  httpStatus?: number;
  retryAfterSeconds?: number;
  classification: SatusehatFhirErrorClassification;
} {
  if (error instanceof SatusehatFhirError) {
    return {
      code: error.code,
      httpStatus: error.httpStatus,
      retryAfterSeconds: error.retryAfterSeconds,
      classification: error.classification,
    };
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    const body = isRecord(response) ? response : {};
    const code = readString(body.code) ?? `HTTP_${error.getStatus()}`;
    const storedClassification = readClassification(body.classification);
    return {
      code,
      httpStatus: error.getStatus(),
      retryAfterSeconds: readNonNegativeInteger(body.retryAfterSeconds),
      classification:
        storedClassification ??
        classifySatusehatFhirFailure({ code, httpStatus: error.getStatus() }),
    };
  }

  const code = error instanceof Error ? error.name : 'SATUSEHAT_UNKNOWN_ERROR';
  return {
    code,
    classification: classifySatusehatFhirFailure({ code }),
  };
}

function calculateBackoffMs(
  retryAttempt: number,
  retryAfterSeconds?: number,
): number {
  const configuredBase = Number(process.env.SATUSEHAT_RETRY_BASE_DELAY_MS);
  const baseDelay =
    Number.isInteger(configuredBase) && configuredBase > 0
      ? configuredBase
      : DEFAULT_RETRY_BASE_DELAY_MS;
  const exponent = Math.min(Math.max(retryAttempt, 0), 5);
  const exponentialDelay = Math.min(
    baseDelay * 2 ** exponent,
    MAX_RETRY_BACKOFF_MS,
  );
  const retryAfterDelay =
    retryAfterSeconds === undefined ? 0 : retryAfterSeconds * 1000;
  return Math.max(exponentialDelay, retryAfterDelay);
}

function readClassification(value: unknown): SatusehatFhirErrorClassification | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !isFailureCategory(value.category) ||
    typeof value.retryable !== 'boolean' ||
    !isOperatorAction(value.operatorAction)
  ) {
    return undefined;
  }
  return {
    category: value.category,
    retryable: value.retryable,
    operatorAction: value.operatorAction,
  };
}

function isFailureCategory(value: unknown): value is IntegrationFailureCategory {
  return (
    value === 'AUTH' ||
    value === 'RATE_LIMIT' ||
    value === 'TRANSIENT' ||
    value === 'VALIDATION' ||
    value === 'DUPLICATE' ||
    value === 'REFERENCE_MISSING' ||
    value === 'TERMINOLOGY' ||
    value === 'CONFIGURATION' ||
    value === 'UNKNOWN'
  );
}

function isOperatorAction(value: unknown): value is IntegrationOperatorAction {
  return (
    value === 'CHECK_CREDENTIALS' ||
    value === 'RETRY_WITH_BACKOFF' ||
    value === 'RECONCILE' ||
    value === 'FIX_REFERENCE' ||
    value === 'FIX_TERMINOLOGY' ||
    value === 'FIX_PAYLOAD' ||
    value === 'CHECK_CONFIGURATION' ||
    value === 'INVESTIGATE'
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function readNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
