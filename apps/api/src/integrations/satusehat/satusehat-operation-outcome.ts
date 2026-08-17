export type SatusehatOperationOutcomeSeverity =
  'fatal' | 'error' | 'warning' | 'information' | 'unknown';

export interface SatusehatOperationOutcomeCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface SatusehatOperationOutcomeIssue {
  severity: SatusehatOperationOutcomeSeverity;
  code?: string;
  details?: {
    coding: SatusehatOperationOutcomeCoding[];
    text?: string;
  };
  diagnostics?: string;
  expression?: string[];
  location?: string[];
}

export interface SatusehatOperationOutcome {
  resourceType: 'OperationOutcome';
  issues: SatusehatOperationOutcomeIssue[];
}

const MAX_ERROR_TEXT_LENGTH = 500;
const SENSITIVE_PAYLOAD_TEXT =
  'Detail error disembunyikan karena memuat data sensitif';

export function parseSatusehatOperationOutcome(
  input: unknown,
): SatusehatOperationOutcome | undefined {
  const body = parseBody(input);
  if (!isRecord(body) || body.resourceType !== 'OperationOutcome') {
    return undefined;
  }

  const rawIssues = Array.isArray(body.issue) ? body.issue : [];
  return {
    resourceType: 'OperationOutcome',
    issues: rawIssues.filter(isRecord).map(parseIssue),
  };
}

export function getSatusehatOperationOutcomeMessage(
  outcome: SatusehatOperationOutcome | undefined,
  httpStatus: number,
): string {
  for (const issue of outcome?.issues ?? []) {
    const message =
      issue.details?.text ??
      issue.diagnostics ??
      issue.details?.coding.find((coding) => coding.display)?.display;
    if (message) return message;
  }
  return `Request FHIR SATUSEHAT gagal (HTTP ${httpStatus})`;
}

function parseBody(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return undefined;
  }
}

function parseIssue(
  issue: Record<string, unknown>,
): SatusehatOperationOutcomeIssue {
  const details = isRecord(issue.details) ? issue.details : undefined;
  const coding = Array.isArray(details?.coding)
    ? details.coding.filter(isRecord).map(parseCoding).filter(hasCodingValue)
    : [];
  const detailsText = sanitizeErrorText(details?.text);
  const diagnostics = sanitizeErrorText(issue.diagnostics);
  const code = sanitizeErrorText(issue.code);
  const expression = sanitizeStringArray(issue.expression);
  const location = sanitizeStringArray(issue.location);

  return {
    severity: parseSeverity(issue.severity),
    ...(code ? { code } : {}),
    ...(details && (coding.length > 0 || detailsText)
      ? { details: { coding, ...(detailsText ? { text: detailsText } : {}) } }
      : {}),
    ...(diagnostics ? { diagnostics } : {}),
    ...(expression.length > 0 ? { expression } : {}),
    ...(location.length > 0 ? { location } : {}),
  };
}

function parseCoding(
  coding: Record<string, unknown>,
): SatusehatOperationOutcomeCoding {
  const system = sanitizeErrorText(coding.system);
  const code = sanitizeErrorText(coding.code);
  const display = sanitizeErrorText(coding.display);
  return {
    ...(system ? { system } : {}),
    ...(code ? { code } : {}),
    ...(display ? { display } : {}),
  };
}

function hasCodingValue(coding: SatusehatOperationOutcomeCoding): boolean {
  return Boolean(coding.system || coding.code || coding.display);
}

function parseSeverity(value: unknown): SatusehatOperationOutcomeSeverity {
  return value === 'fatal' ||
    value === 'error' ||
    value === 'warning' ||
    value === 'information'
    ? value
    : 'unknown';
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeErrorText)
    .filter((item): item is string => Boolean(item));
}

function sanitizeErrorText(value: unknown): string | undefined {
  const text = readString(value);
  if (!text) return undefined;

  if (
    /(?:request|response)?\s*payload\s*[:=]/i.test(text) ||
    /\b(?:resourceType|identifier|telecom|address|birthDate|nik)\s*[:=]/i.test(
      text,
    ) ||
    /(?:\[|\{)[\s\S]*["'](?:resourceType|identifier|telecom|address)["']\s*:/i.test(
      text,
    )
  ) {
    return SENSITIVE_PAYLOAD_TEXT;
  }

  const sanitized = text
    .replace(
      /(\bauthorization\s*["']?\s*[:=]\s*["']?)\s*(?:(?:Bearer|Basic)\s+)?[^\s"',;}]+/gi,
      '$1[REDACTED]',
    )
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
    .replace(
      /((?:access[_-]?token|refresh[_-]?token|client[_-]?(?:id|secret)|password|api[_-]?key)\s*["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi,
      '$1[REDACTED]',
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[REDACTED_TOKEN]',
    )
    .replace(/\b\d{12,}\b/g, '[REDACTED_ID]');

  return sanitized.slice(0, MAX_ERROR_TEXT_LENGTH);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
