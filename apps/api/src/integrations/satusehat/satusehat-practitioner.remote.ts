import { BadGatewayException } from '@nestjs/common';
import type {
  SatusehatPractitionerGender,
  SatusehatPractitionerIdentifier,
  SatusehatPractitionerRemoteSummary,
} from '@mitrafaskes/shared';

export interface RemotePractitioner {
  externalResourceId: string;
  name: string;
  active: boolean;
  gender?: SatusehatPractitionerGender;
  birthDate?: string;
  identifiers: SatusehatPractitionerIdentifier[];
}

export function parseSearchResponse(response: unknown): RemotePractitioner[] {
  if (!isRecord(response)) return [];
  if (response.resourceType === 'Practitioner') {
    return [parseRemotePractitioner(response)];
  }
  if (response.resourceType !== 'Bundle' || !Array.isArray(response.entry)) {
    return [];
  }

  const records = response.entry.flatMap((entry) => {
    if (!isRecord(entry) || !isRecord(entry.resource)) return [];
    try {
      return [parseRemotePractitioner(entry.resource)];
    } catch {
      return [];
    }
  });

  const unique = new Map<string, RemotePractitioner>();
  for (const record of records) {
    if (!unique.has(record.externalResourceId)) {
      unique.set(record.externalResourceId, record);
    }
  }
  return [...unique.values()];
}

export function parseRemotePractitioner(response: unknown): RemotePractitioner {
  if (!isRecord(response) || response.resourceType !== 'Practitioner') {
    throw new BadGatewayException({
      code: 'SATUSEHAT_PRACTITIONER_RESPONSE_INVALID',
      message: 'Response Practitioner SATUSEHAT tidak valid',
    });
  }

  const identifiers = readIdentifiers(response.identifier);
  const externalResourceId =
    readPractitionerHisNumber(identifiers) ?? readRecordString(response, 'id');
  if (!externalResourceId) {
    throw new BadGatewayException({
      code: 'SATUSEHAT_PRACTITIONER_RESPONSE_INCOMPLETE',
      message: 'Response Practitioner SATUSEHAT tidak memiliki id',
    });
  }

  return {
    externalResourceId,
    name: readName(response.name) ?? `Practitioner ${externalResourceId}`,
    active: response.active !== false,
    gender: readGender(response.gender),
    birthDate: readRecordString(response, 'birthDate'),
    identifiers,
  };
}

function readPractitionerHisNumber(
  identifiers: SatusehatPractitionerIdentifier[],
): string | undefined {
  const identifier = identifiers.find(
    ({ system, value }) =>
      (system === 'https://fhir.kemkes.go.id/id/nakes-his-number' ||
        system === 'http://sys-ids.kemkes.go.id/practitioner') &&
      /^\d{8,20}$/.test(value),
  );
  return identifier?.value;
}

export function toRemoteSummary(
  record: RemotePractitioner,
  linkedLocalResourceId?: string,
): SatusehatPractitionerRemoteSummary {
  return {
    ...record,
    linkedLocalResourceId,
  };
}

function readName(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const names = value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const text = readRecordString(entry, 'text');
    if (text) return [text];

    const prefix = readStringArray(entry.prefix);
    const given = readStringArray(entry.given);
    const family = readRecordString(entry, 'family');
    const composed = [...prefix, ...given, family]
      .filter((part): part is string => Boolean(part))
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
    return composed ? [composed] : [];
  });
  return names[0];
}

function readIdentifiers(value: unknown): SatusehatPractitionerIdentifier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const system = readRecordString(entry, 'system');
    const identifierValue = readRecordString(entry, 'value');
    return system && identifierValue
      ? [{ system, value: identifierValue }]
      : [];
  });
}

function readGender(value: unknown): SatusehatPractitionerGender | undefined {
  return value === 'male' ||
    value === 'female' ||
    value === 'other' ||
    value === 'unknown'
    ? value
    : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function readRecordString(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = record[field];
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
