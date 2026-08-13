import type { SatusehatOperationOutcome } from './satusehat-operation-outcome';

export type SatusehatFhirErrorCategory =
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'TRANSIENT'
  | 'VALIDATION'
  | 'DUPLICATE'
  | 'REFERENCE_MISSING'
  | 'TERMINOLOGY'
  | 'CONFIGURATION'
  | 'UNKNOWN';

export type SatusehatFhirOperatorAction =
  | 'CHECK_CREDENTIALS'
  | 'RETRY_WITH_BACKOFF'
  | 'RECONCILE'
  | 'FIX_REFERENCE'
  | 'FIX_TERMINOLOGY'
  | 'FIX_PAYLOAD'
  | 'CHECK_CONFIGURATION'
  | 'INVESTIGATE';

export interface SatusehatFhirErrorClassification {
  category: SatusehatFhirErrorCategory;
  retryable: boolean;
  operatorAction: SatusehatFhirOperatorAction;
}

export interface SatusehatFhirFailureContext {
  code: string;
  httpStatus?: number;
  operationOutcome?: SatusehatOperationOutcome;
}

const AUTH_STATUSES = new Set([401, 403]);
const TRANSIENT_STATUSES = new Set([408, 425]);
const VALIDATION_STATUSES = new Set([400, 422]);

export function classifySatusehatFhirFailure(
  context: SatusehatFhirFailureContext,
): SatusehatFhirErrorClassification {
  const issueText = collectIssueText(context.operationOutcome);
  const signalText = `${context.code} ${issueText}`.toLowerCase();

  if (
    context.code === 'SATUSEHAT_FHIR_BASE_URL_MISSING' ||
    context.code === 'SATUSEHAT_FHIR_URL_INVALID' ||
    includesAny(signalText, [
      'credentials_missing',
      'configuration',
      'organization_id',
      'oauth_base_url',
      'oauth_url',
      'token_response_invalid',
    ])
  ) {
    return classification('CONFIGURATION', false, 'CHECK_CONFIGURATION');
  }

  if (
    includesAny(signalText, [
      'timeout',
      'network error',
      'network_error',
      'connection reset',
      'econnreset',
    ])
  ) {
    return classification('TRANSIENT', true, 'RETRY_WITH_BACKOFF');
  }

  if (
    AUTH_STATUSES.has(context.httpStatus ?? 0) ||
    includesAny(signalText, [
      'unauthorized',
      'forbidden',
      'authentication',
      'not authenticated',
    ])
  ) {
    return classification('AUTH', false, 'CHECK_CREDENTIALS');
  }

  if (
    context.httpStatus === 429 ||
    includesAny(signalText, ['rate limit', 'too many requests', 'throttled'])
  ) {
    return classification('RATE_LIMIT', true, 'RETRY_WITH_BACKOFF');
  }

  if (
    includesAny(signalText, [
      'id_missing',
      'id_mismatch',
      'response_invalid',
      'response_incomplete',
      'remote_id_mismatch',
    ])
  ) {
    return classification('UNKNOWN', false, 'RECONCILE');
  }

  if (
    includesAny(signalText, [
      'dependency',
      'reference',
      'not_synced',
      'not-linked',
      'not_linked',
      'missing_reference',
    ]) ||
    includesAny(issueText, [
      'reference is required',
      'reference missing',
      'reference not found',
      'reference could not be resolved',
      'linked location reference',
      'linked organization reference',
      'linked patient reference',
      'linked practitioner reference',
      'must be linked',
      'belum terhubung',
      'not linked',
    ])
  ) {
    return classification('REFERENCE_MISSING', false, 'FIX_REFERENCE');
  }

  if (
    includesAny(signalText, [
      'terminology',
      'value set',
      'valueset',
      'code system',
      'codesystem',
      'loinc',
      'ucum',
      'icd-10',
      'icd-9',
      'snomed',
      'kfa',
    ])
  ) {
    return classification('TERMINOLOGY', false, 'FIX_TERMINOLOGY');
  }

  if (
    includesAny(signalText, [
      'invalid',
      'required',
      'invariant',
      'business-rule',
      'structure',
      'value',
    ])
  ) {
    return classification('VALIDATION', false, 'FIX_PAYLOAD');
  }

  if (
    context.httpStatus === 409 ||
    includesAny(signalText, ['duplicate', 'already exists', 'conflict'])
  ) {
    return classification('DUPLICATE', false, 'RECONCILE');
  }

  if (
    VALIDATION_STATUSES.has(context.httpStatus ?? 0)
  ) {
    return classification('VALIDATION', false, 'FIX_PAYLOAD');
  }

  if (
    TRANSIENT_STATUSES.has(context.httpStatus ?? 0) ||
    ((context.httpStatus ?? 0) >= 500 && (context.httpStatus ?? 0) <= 599)
  ) {
    return classification('TRANSIENT', true, 'RETRY_WITH_BACKOFF');
  }

  return classification('UNKNOWN', false, 'INVESTIGATE');
}

function classification(
  category: SatusehatFhirErrorCategory,
  retryable: boolean,
  operatorAction: SatusehatFhirOperatorAction,
): SatusehatFhirErrorClassification {
  return { category, retryable, operatorAction };
}

function collectIssueText(
  outcome: SatusehatOperationOutcome | undefined,
): string {
  return (outcome?.issues ?? [])
    .flatMap((issue) => [
      issue.code,
      issue.details?.text,
      issue.diagnostics,
      ...(issue.expression ?? []),
      ...(issue.location ?? []),
      ...(issue.details?.coding.flatMap((coding) => [
        coding.system,
        coding.code,
        coding.display,
      ]) ?? []),
    ])
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
}

function includesAny(value: string, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}
