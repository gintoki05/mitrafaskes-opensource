import {
  OBSERVATION_CATEGORY_CODE,
  OBSERVATION_CATEGORY_DISPLAY,
  OBSERVATION_CATEGORY_SYSTEM,
  OBSERVATION_LOINC_SYSTEM,
  OBSERVATION_UCUM_SYSTEM,
} from './satusehat-observation.constants';

export interface SatusehatObservationCoding {
  system: string;
  code: string;
  display: string;
}

export interface SatusehatObservationReference {
  reference: string;
  display?: string;
}

export interface SatusehatObservationQuantity {
  value: number;
  unit: string;
  system: typeof OBSERVATION_UCUM_SYSTEM;
  code: string;
}

export interface SatusehatObservationPayload {
  resourceType: 'Observation';
  id?: string;
  status:
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'cancelled'
    | 'entered-in-error'
    | 'unknown';
  category: { coding: SatusehatObservationCoding[] }[];
  code: { coding: SatusehatObservationCoding[] };
  subject: SatusehatObservationReference;
  encounter: SatusehatObservationReference;
  effectiveDateTime: string;
  performer: SatusehatObservationReference[];
  valueQuantity?: SatusehatObservationQuantity;
  valueCodeableConcept?: {
    coding: SatusehatObservationCoding[];
    text?: string;
  };
  valueBoolean?: boolean;
  valueString?: string;
  derivedFrom?: SatusehatObservationReference[];
  referenceRange?: Array<{
    low?: SatusehatObservationQuantity;
    high?: SatusehatObservationQuantity;
  }>;
  interpretation?: { coding: SatusehatObservationCoding[] }[];
}

export type SatusehatObservationOperation = 'CREATE' | 'UPDATE';
export type SatusehatObservationMappingStatus = 'MAPPED' | 'MAPPING_REQUIRED';
export type SatusehatObservationProvenance = 'original' | 'derived';

export interface SatusehatObservationPreview {
  localResourceId: string;
  encounterLocalResourceId: string;
  operation: SatusehatObservationOperation;
  externalResourceId?: string;
  mappingStatus: SatusehatObservationMappingStatus;
  provenance: SatusehatObservationProvenance;
  valueType: 'quantity' | 'code' | 'boolean' | 'string';
  payload: SatusehatObservationPayload;
}

export interface SatusehatObservationSyncResult
  extends Omit<SatusehatObservationPreview, 'payload'> {
  syncedRemotely: boolean;
  syncLogId: string;
  response?: { resourceType: 'Observation'; id: string };
}

export interface SatusehatObservationContractIssue {
  field: string;
  message: string;
}

export class SatusehatObservationContractError extends Error {
  constructor(public readonly issues: SatusehatObservationContractIssue[]) {
    super('Payload Observation tidak memenuhi kontrak SATUSEHAT');
    this.name = 'SatusehatObservationContractError';
  }
}

export function validateSatusehatObservationPayload(
  input: unknown,
): SatusehatObservationContractIssue[] {
  const issues: SatusehatObservationContractIssue[] = [];
  const payload = asRecord(input);
  requireEqual(payload.resourceType, 'Observation', 'resourceType', issues);
  if (payload.id !== undefined) requireText(payload.id, 'id', issues);
  requireText(payload.status, 'status', issues);
  requireCoding(
    firstCodingFromArray(payload.category, 'category', issues),
    {
      system: OBSERVATION_CATEGORY_SYSTEM,
      code: OBSERVATION_CATEGORY_CODE,
      display: OBSERVATION_CATEGORY_DISPLAY,
    },
    'category[0].coding[0]',
    issues,
  );
  const code = firstCoding(payload.code, 'code', issues);
  if (code) {
    const codeRecord = asRecord(code);
    requireCodingSystem(codeRecord, OBSERVATION_LOINC_SYSTEM, 'code.coding[0]', issues);
    requireText(codeRecord.code, 'code.coding[0].code', issues);
    requireText(codeRecord.display, 'code.coding[0].display', issues);
  }
  requireReference(payload.subject, 'Patient', 'subject', issues);
  requireReference(payload.encounter, 'Encounter', 'encounter', issues);
  requireText(payload.effectiveDateTime, 'effectiveDateTime', issues);

  if (!Array.isArray(payload.performer) || payload.performer.length === 0) {
    issues.push({ field: 'performer', message: 'performer wajib berisi satu Practitioner.' });
  } else {
    payload.performer.forEach((entry, index) =>
      requireReference(entry, 'Practitioner', `performer[${index}]`, issues),
    );
  }

  const valueFields = [
    'valueQuantity',
    'valueCodeableConcept',
    'valueBoolean',
    'valueString',
  ].filter((field) => payload[field] !== undefined);
  if (valueFields.length !== 1) {
    issues.push({
      field: 'value[x]',
      message: 'Observation harus memiliki tepat satu value[x].',
    });
  }
  if (payload.valueQuantity !== undefined) {
    const quantity = asRecord(payload.valueQuantity);
    if (typeof quantity.value !== 'number' || !Number.isFinite(quantity.value)) {
      issues.push({
        field: 'valueQuantity.value',
        message: 'valueQuantity.value harus berupa angka finite, bukan string.',
      });
    }
    requireText(quantity.unit, 'valueQuantity.unit', issues);
    if (quantity.system !== OBSERVATION_UCUM_SYSTEM) {
      issues.push({
        field: 'valueQuantity.system',
        message: `System unit harus ${OBSERVATION_UCUM_SYSTEM}.`,
      });
    }
    requireText(quantity.code, 'valueQuantity.code', issues);
  }
  if (payload.derivedFrom !== undefined) {
    if (!Array.isArray(payload.derivedFrom) || payload.derivedFrom.length === 0) {
      issues.push({
        field: 'derivedFrom',
        message: 'derivedFrom harus berisi source Observation.',
      });
    } else {
      payload.derivedFrom.forEach((entry, index) =>
        requireReference(entry, 'Observation', `derivedFrom[${index}]`, issues),
      );
    }
  }

  return issues;
}

export function assertSatusehatObservationPayload(
  payload: SatusehatObservationPayload,
): void {
  const issues = validateSatusehatObservationPayload(payload);
  if (issues.length > 0) {
    throw new SatusehatObservationContractError(issues);
  }
}

function firstCoding(
  value: unknown,
  field: string,
  issues: SatusehatObservationContractIssue[],
): unknown {
  const record = asRecord(value);
  if (!Array.isArray(record.coding) || record.coding.length === 0) {
    issues.push({ field: `${field}.coding`, message: 'coding wajib berisi satu item.' });
    return undefined;
  }
  return record.coding[0];
}

function firstCodingFromArray(
  value: unknown,
  field: string,
  issues: SatusehatObservationContractIssue[],
): unknown {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ field, message: `${field} wajib berisi satu item.` });
    return undefined;
  }
  return firstCoding(value[0], `${field}[0]`, issues);
}

function requireCoding(
  value: unknown,
  expected: Pick<SatusehatObservationCoding, 'system' | 'code' | 'display'>,
  field: string,
  issues: SatusehatObservationContractIssue[],
): void {
  const coding = asRecord(value);
  if (
    coding.system !== expected.system ||
    coding.code !== expected.code ||
    coding.display !== expected.display
  ) {
    issues.push({ field, message: `Terminology ${field} tidak sesuai profile Observation.` });
  }
}

function requireCodingSystem(
  value: unknown,
  system: string,
  field: string,
  issues: SatusehatObservationContractIssue[],
): void {
  if (asRecord(value).system !== system) {
    issues.push({ field: `${field}.system`, message: `System harus ${system}.` });
  }
}

function requireReference(
  value: unknown,
  resourceType: string,
  field: string,
  issues: SatusehatObservationContractIssue[],
): void {
  const reference = asRecord(value).reference;
  if (
    typeof reference !== 'string' ||
    !new RegExp(`^${resourceType}/[^/\\s]+$`).test(reference)
  ) {
    issues.push({ field: `${field}.reference`, message: `Reference harus ${resourceType}/{id}.` });
  }
}

function requireText(
  value: unknown,
  field: string,
  issues: SatusehatObservationContractIssue[],
): void {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ field, message: `${field} wajib diisi.` });
  }
}

function requireEqual(
  value: unknown,
  expected: string,
  field: string,
  issues: SatusehatObservationContractIssue[],
): void {
  if (value !== expected) issues.push({ field, message: `${field} harus ${expected}.` });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
