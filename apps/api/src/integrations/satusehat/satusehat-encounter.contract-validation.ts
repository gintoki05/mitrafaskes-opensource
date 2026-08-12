import type { SatusehatEncounterStatus } from '@mitrafaskes/shared';

export interface SatusehatEncounterContractIssue {
  path: string;
  message: string;
}

const statuses = new Set<SatusehatEncounterStatus>([
  'arrived',
  'in-progress',
  'finished',
  'cancelled',
]);
const utcDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|\+00:00)$/;
const minimumSatusehatTime = Date.parse('2014-06-03T00:00:00.000Z');

export function readPeriod(
  value: unknown,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): { start?: string; end?: string } | undefined {
  const period = asRecord(value);
  const start = requireUtcDateTime(period.start, `${path}.start`, issues);
  const end =
    period.end === undefined
      ? undefined
      : requireUtcDateTime(period.end, `${path}.end`, issues);
  if (start && end && Date.parse(end) < Date.parse(start)) {
    addIssue(issues, `${path}.end`, 'Waktu selesai tidak boleh sebelum mulai');
  }
  return { start, end };
}

export function readStatus(
  value: unknown,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): SatusehatEncounterStatus | undefined {
  if (!statuses.has(value as SatusehatEncounterStatus)) {
    addIssue(issues, path, 'Status Encounter FHIR tidak valid');
    return undefined;
  }
  return value as SatusehatEncounterStatus;
}

export function requireCoding(
  value: unknown,
  expected: { system: string; code: string; display: string },
  path: string,
  issues: SatusehatEncounterContractIssue[],
): void {
  const coding = asRecord(value);
  requireEqual(coding.system, expected.system, `${path}.system`, issues);
  requireEqual(coding.code, expected.code, `${path}.code`, issues);
  requireEqual(coding.display, expected.display, `${path}.display`, issues);
}

export function requireReference(
  value: unknown,
  resourceType: string,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): string | undefined {
  const reference = requireText(
    asRecord(value).reference,
    `${path}.reference`,
    issues,
  );
  const prefix = `${resourceType}/`;
  if (!reference?.startsWith(prefix) || reference.length === prefix.length) {
    addIssue(
      issues,
      `${path}.reference`,
      `Referensi harus menunjuk ke ${resourceType} SATUSEHAT`,
    );
    return undefined;
  }
  return reference.slice(prefix.length);
}

export function firstRecord(
  value: unknown,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): Record<string, unknown> {
  const items = readArray(value, path, issues);
  return asRecord(items[0]);
}

export function readArray(
  value: unknown,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(issues, path, `${path} wajib berisi minimal satu item`);
    return [];
  }
  return value;
}

export function requireText(
  value: unknown,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, `${path} wajib diisi`);
    return undefined;
  }
  return value;
}

export function requireEqual(
  value: unknown,
  expected: string,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): void {
  if (value !== expected) {
    addIssue(issues, path, `${path} harus bernilai ${expected}`);
  }
}

export function addIssue(
  issues: SatusehatEncounterContractIssue[],
  path: string,
  message: string,
): void {
  if (
    !issues.some((issue) => issue.path === path && issue.message === message)
  ) {
    issues.push({ path, message });
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireUtcDateTime(
  value: unknown,
  path: string,
  issues: SatusehatEncounterContractIssue[],
): string | undefined {
  const dateTime = requireText(value, path, issues);
  if (!dateTime) return undefined;
  const parsed = Date.parse(dateTime);
  if (
    !utcDateTimePattern.test(dateTime) ||
    Number.isNaN(parsed) ||
    parsed < minimumSatusehatTime
  ) {
    addIssue(
      issues,
      path,
      'Waktu harus valid, tidak sebelum 3 Juni 2014, dan memakai UTC +00',
    );
  }
  return dateTime;
}
