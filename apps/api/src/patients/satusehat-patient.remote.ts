import { BadGatewayException } from '@nestjs/common';
import type {
  SatusehatPatientGender,
  SatusehatPatientIdentifier,
  SatusehatPatientRemoteSummary,
} from '@mitrafaskes/shared';

export interface RemotePatient {
  externalResourceId: string;
  name: string;
  active: boolean;
  gender?: SatusehatPatientGender;
  birthDate?: string;
  identifiers: SatusehatPatientIdentifier[];
}

export function parseSearchResponse(response: unknown): RemotePatient[] {
  if (!isRecord(response)) return [];
  if (response.resourceType === 'Patient') {
    return [parseRemotePatient(response)];
  }
  if (response.resourceType !== 'Bundle' || !Array.isArray(response.entry)) {
    return [];
  }

  const records = response.entry.flatMap((entry) => {
    if (!isRecord(entry) || !isRecord(entry.resource)) return [];
    try {
      return [parseRemotePatient(entry.resource)];
    } catch {
      return [];
    }
  });

  const unique = new Map<string, RemotePatient>();
  for (const record of records) {
    if (!unique.has(record.externalResourceId)) {
      unique.set(record.externalResourceId, record);
    }
  }
  return [...unique.values()];
}

export function parseRemotePatient(response: unknown): RemotePatient {
  if (!isRecord(response) || response.resourceType !== 'Patient') {
    throw new BadGatewayException({
      code: 'SATUSEHAT_PATIENT_RESPONSE_INVALID',
      message: 'Response Patient SATUSEHAT tidak valid',
    });
  }

  const identifiers = readIdentifiers(response.identifier);
  const externalResourceId =
    readPatientIhsNumber(identifiers) ?? readRecordString(response, 'id');
  if (!externalResourceId) {
    throw new BadGatewayException({
      code: 'SATUSEHAT_PATIENT_RESPONSE_INCOMPLETE',
      message: 'Response Patient SATUSEHAT tidak memiliki ID IHS atau id',
    });
  }

  return {
    externalResourceId,
    name: readName(response.name) ?? `Patient ${externalResourceId}`,
    active: response.active !== false,
    gender: readGender(response.gender),
    birthDate: readRecordString(response, 'birthDate'),
    identifiers,
  };
}

export function toRemoteSummary(
  record: RemotePatient,
  linkedLocalResourceId?: string,
): SatusehatPatientRemoteSummary {
  return {
    ...record,
    linkedLocalResourceId,
  };
}

function readPatientIhsNumber(
  identifiers: SatusehatPatientIdentifier[],
): string | undefined {
  const identifier = identifiers.find(
    ({ system, value }) =>
      system === 'https://fhir.kemkes.go.id/id/ihs-number' && value.trim(),
  );
  return identifier?.value;
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

function readIdentifiers(value: unknown): SatusehatPatientIdentifier[] {
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

function readGender(value: unknown): SatusehatPatientGender | undefined {
  return value === 'male' || value === 'female' ? value : undefined;
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
