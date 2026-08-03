import { BadGatewayException } from '@nestjs/common';
import type { SatusehatOrganizationRemoteSummary } from '@mitrafaskes/shared';

export interface RemoteOrganization {
  externalResourceId: string;
  name: string;
  active: boolean;
  typeCode?: string;
  typeDisplay?: string;
  parentExternalResourceId?: string;
  parentDisplay?: string;
  identifiers: {
    system: string;
    value: string;
  }[];
  addressText?: string;
  phone?: string;
  email?: string;
}

export function parseSearchResponse(response: unknown): RemoteOrganization[] {
  if (!isRecord(response)) return [];
  if (response.resourceType === 'Organization') {
    return [parseRemoteOrganization(response)];
  }
  if (response.resourceType !== 'Bundle' || !Array.isArray(response.entry)) {
    return [];
  }

  return response.entry.flatMap((entry) => {
    if (!isRecord(entry) || !isRecord(entry.resource)) return [];
    try {
      return [parseRemoteOrganization(entry.resource)];
    } catch {
      return [];
    }
  });
}

export function parseRemoteOrganization(response: unknown): RemoteOrganization {
  if (!isRecord(response) || response.resourceType !== 'Organization') {
    throw new BadGatewayException({
      code: 'SATUSEHAT_ORGANIZATION_RESPONSE_INVALID',
      message: 'Response Organization SATUSEHAT tidak valid',
    });
  }

  const externalResourceId = readRecordString(response, 'id');
  const name = readRecordString(response, 'name');
  if (!externalResourceId || !name) {
    throw new BadGatewayException({
      code: 'SATUSEHAT_ORGANIZATION_RESPONSE_INCOMPLETE',
      message: 'Response Organization SATUSEHAT tidak memiliki id atau nama',
    });
  }

  const parent = readReference(response.partOf);
  const type = readFirstCoding(response.type);
  const address = readFirstAddress(response.address);
  const telecom = Array.isArray(response.telecom) ? response.telecom : [];
  const identifiers = Array.isArray(response.identifier)
    ? response.identifier.flatMap((identifier) => {
        if (!isRecord(identifier)) return [];
        const system = readRecordString(identifier, 'system');
        const value = readRecordString(identifier, 'value');
        return system && value ? [{ system, value }] : [];
      })
    : [];

  return {
    externalResourceId,
    name,
    active: typeof response.active === 'boolean' ? response.active : true,
    typeCode: type?.code,
    typeDisplay: type?.display,
    parentExternalResourceId: parent?.id,
    parentDisplay: parent?.display,
    identifiers,
    addressText: address,
    phone: readTelecomValue(telecom, 'phone'),
    email: readTelecomValue(telecom, 'email'),
  };
}

export function toRemoteSummary(
  record: RemoteOrganization,
): SatusehatOrganizationRemoteSummary {
  return {
    externalResourceId: record.externalResourceId,
    name: record.name,
    active: record.active,
    typeCode: record.typeCode,
    typeDisplay: record.typeDisplay,
    parentExternalResourceId: record.parentExternalResourceId,
    parentDisplay: record.parentDisplay,
    identifiers: record.identifiers,
    addressText: record.addressText,
    phone: record.phone,
    email: record.email,
  };
}

function readReference(
  value: unknown,
): { id: string; display?: string } | undefined {
  if (!isRecord(value)) return undefined;
  const reference = readRecordString(value, 'reference');
  if (!reference) return undefined;
  const match = /^Organization\/(.+)$/.exec(reference);
  if (!match) return undefined;
  return {
    id: match[1],
    display: readRecordString(value, 'display'),
  };
}

function readFirstCoding(
  value: unknown,
): { code?: string; display?: string } | undefined {
  if (!Array.isArray(value) || !isRecord(value[0])) return undefined;
  const coding = value[0].coding;
  if (!Array.isArray(coding) || !isRecord(coding[0])) return undefined;
  return {
    code: readRecordString(coding[0], 'code'),
    display: readRecordString(coding[0], 'display'),
  };
}

function readFirstAddress(value: unknown): string | undefined {
  if (!Array.isArray(value) || !isRecord(value[0])) return undefined;
  const address = value[0];
  const text = readRecordString(address, 'text');
  if (text) return text;
  const lines = Array.isArray(address.line)
    ? address.line.filter((line): line is string => typeof line === 'string')
    : [];
  const city = readRecordString(address, 'city');
  const postalCode = readRecordString(address, 'postalCode');
  const parts = [...lines, city, postalCode].filter((part): part is string =>
    Boolean(part),
  );
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function readTelecomValue(
  value: unknown[],
  system: 'phone' | 'email',
): string | undefined {
  const telecom = value.find(
    (entry) => isRecord(entry) && readRecordString(entry, 'system') === system,
  );
  return isRecord(telecom) ? readRecordString(telecom, 'value') : undefined;
}

function readRecordString(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  return optionalText(record[field]);
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
