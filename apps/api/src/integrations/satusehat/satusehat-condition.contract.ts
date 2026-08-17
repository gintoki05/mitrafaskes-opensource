import {
  CONDITION_CATEGORY_CODE,
  CONDITION_CATEGORY_DISPLAY,
  CONDITION_CATEGORY_SYSTEM,
  CONDITION_CODE_SYSTEM,
  SATUSEHAT_CONDITION_STATUS,
} from './satusehat-condition.constants';

export interface SatusehatConditionCoding {
  system: string;
  code: string;
  display: string;
}

export interface SatusehatConditionReference {
  reference: string;
  display?: string;
}

export interface SatusehatConditionPayload {
  resourceType: 'Condition';
  id?: string;
  clinicalStatus: { coding: SatusehatConditionCoding[] };
  verificationStatus: { coding: SatusehatConditionCoding[] };
  category: { coding: SatusehatConditionCoding[] }[];
  code: { coding: SatusehatConditionCoding[] };
  subject: SatusehatConditionReference;
  encounter: SatusehatConditionReference;
  onsetDateTime?: string;
  recordedDate: string;
  recorder: SatusehatConditionReference;
  asserter: SatusehatConditionReference;
  note?: { text: string }[];
}

export type SatusehatConditionOperation = 'CREATE' | 'UPDATE';
export type SatusehatConditionMappingStatus = 'MAPPED' | 'MAPPING_REQUIRED';

export interface SatusehatConditionPreview {
  localResourceId: string;
  encounterLocalResourceId: string;
  operation: SatusehatConditionOperation;
  externalResourceId?: string;
  rank: number;
  category: typeof CONDITION_CATEGORY_CODE;
  mappingStatus: SatusehatConditionMappingStatus;
  payload: SatusehatConditionPayload;
}

export interface SatusehatConditionSyncResult extends Omit<
  SatusehatConditionPreview,
  'payload'
> {
  syncedRemotely: boolean;
  syncLogId: string;
  response?: { resourceType: 'Condition'; id: string };
  encounterSyncLogId?: string;
}

export interface SatusehatConditionContractIssue {
  field: string;
  message: string;
}

export class SatusehatConditionContractError extends Error {
  constructor(public readonly issues: SatusehatConditionContractIssue[]) {
    super('Payload Condition tidak memenuhi kontrak SATUSEHAT');
    this.name = 'SatusehatConditionContractError';
  }
}

export function validateSatusehatConditionPayload(
  input: unknown,
): SatusehatConditionContractIssue[] {
  const issues: SatusehatConditionContractIssue[] = [];
  const payload = asRecord(input);
  requireEqual(payload.resourceType, 'Condition', 'resourceType', issues);
  if (payload.id !== undefined) requireText(payload.id, 'id', issues);

  requireCoding(
    firstCoding(payload.clinicalStatus, 'clinicalStatus', issues),
    SATUSEHAT_CONDITION_STATUS.clinical,
    'clinicalStatus.coding[0]',
    issues,
  );
  requireCoding(
    firstCoding(payload.verificationStatus, 'verificationStatus', issues),
    SATUSEHAT_CONDITION_STATUS.verification,
    'verificationStatus.coding[0]',
    issues,
  );
  requireCoding(
    firstCodingFromArray(payload.category, 'category', issues),
    {
      system: CONDITION_CATEGORY_SYSTEM,
      code: CONDITION_CATEGORY_CODE,
      display: CONDITION_CATEGORY_DISPLAY,
    },
    'category[0].coding[0]',
    issues,
  );

  const code = firstCoding(payload.code, 'code', issues);
  if (code) {
    const codeRecord = asRecord(code);
    requireCodingSystem(
      codeRecord,
      CONDITION_CODE_SYSTEM,
      'code.coding[0]',
      issues,
    );
    requireText(codeRecord.code, 'code.coding[0].code', issues);
    requireText(codeRecord.display, 'code.coding[0].display', issues);
  }

  requireReference(payload.subject, 'Patient', 'subject', issues);
  requireReference(payload.encounter, 'Encounter', 'encounter', issues);
  requireReference(payload.recorder, 'Practitioner', 'recorder', issues);
  requireReference(payload.asserter, 'Practitioner', 'asserter', issues);
  requireText(payload.recordedDate, 'recordedDate', issues);
  if (payload.onsetDateTime !== undefined) {
    requireText(payload.onsetDateTime, 'onsetDateTime', issues);
  }
  if (payload.note !== undefined) {
    if (!Array.isArray(payload.note) || payload.note.length === 0) {
      issues.push({
        field: 'note',
        message: 'note harus berupa daftar yang tidak kosong.',
      });
    } else {
      payload.note.forEach((entry, index) => {
        requireText(asRecord(entry).text, `note[${index}].text`, issues);
      });
    }
  }

  return issues;
}

export function assertSatusehatConditionPayload(
  payload: SatusehatConditionPayload,
): void {
  const issues = validateSatusehatConditionPayload(payload);
  if (issues.length > 0) throw new SatusehatConditionContractError(issues);
}

function firstCoding(
  value: unknown,
  field: string,
  issues: SatusehatConditionContractIssue[],
): unknown {
  const record = asRecord(value);
  if (!Array.isArray(record.coding) || record.coding.length === 0) {
    issues.push({
      field: `${field}.coding`,
      message: 'coding wajib berisi satu item.',
    });
    return undefined;
  }
  return record.coding[0];
}

function firstCodingFromArray(
  value: unknown,
  field: string,
  issues: SatusehatConditionContractIssue[],
): unknown {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ field, message: `${field} wajib berisi satu item.` });
    return undefined;
  }
  const first = asRecord(value[0]);
  return firstCoding(first, `${field}[0]`, issues);
}

function requireCoding(
  value: unknown,
  expected: Pick<SatusehatConditionCoding, 'system' | 'code' | 'display'>,
  field: string,
  issues: SatusehatConditionContractIssue[],
): void {
  const coding = asRecord(value);
  if (
    coding.system !== expected.system ||
    coding.code !== expected.code ||
    coding.display !== expected.display
  ) {
    issues.push({
      field,
      message: `Terminology ${field} tidak sesuai profile Condition.`,
    });
  }
}

function requireCodingSystem(
  value: unknown,
  system: string,
  field: string,
  issues: SatusehatConditionContractIssue[],
): void {
  const coding = asRecord(value);
  if (coding.system !== system) {
    issues.push({
      field: `${field}.system`,
      message: `System harus ${system}.`,
    });
  }
}

function requireReference(
  value: unknown,
  resourceType: string,
  field: string,
  issues: SatusehatConditionContractIssue[],
): void {
  const reference = asRecord(value).reference;
  if (
    typeof reference !== 'string' ||
    !new RegExp(`^${resourceType}/[^/\\s]+$`).test(reference)
  ) {
    issues.push({
      field: `${field}.reference`,
      message: `Reference harus ${resourceType}/{id}.`,
    });
  }
}

function requireText(
  value: unknown,
  field: string,
  issues: SatusehatConditionContractIssue[],
): void {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ field, message: `${field} wajib diisi.` });
  }
}

function requireEqual(
  value: unknown,
  expected: string,
  field: string,
  issues: SatusehatConditionContractIssue[],
): void {
  if (value !== expected)
    issues.push({ field, message: `${field} harus ${expected}.` });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
