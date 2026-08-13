import { BadGatewayException } from '@nestjs/common';
import type { SatusehatLocationRemoteSummary } from '@mitrafaskes/shared';

export type RemoteLocationStatus = 'active' | 'suspended' | 'inactive';
export type RemoteLocationMode = 'instance' | 'kind';

export interface RemoteLocation {
  externalResourceId: string;
  identifierSystem?: string;
  identifierValue?: string;
  name: string;
  description?: string;
  status: RemoteLocationStatus;
  mode: RemoteLocationMode;
  physicalTypeCode?: string;
  physicalTypeDisplay?: string;
  managingOrganizationExternalResourceId?: string;
  managingOrganizationDisplay?: string;
  parentExternalResourceId?: string;
  parentDisplay?: string;
  addressText?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
}

export function parseSearchResponse(response: unknown): RemoteLocation[] {
  if (!isRecord(response)) return [];
  if (response.resourceType === 'Location') {
    return [parseRemoteLocation(response)];
  }
  if (response.resourceType !== 'Bundle' || !Array.isArray(response.entry)) {
    return [];
  }

  return response.entry.flatMap((entry) => {
    if (!isRecord(entry) || !isRecord(entry.resource)) return [];
    try {
      return [parseRemoteLocation(entry.resource)];
    } catch {
      return [];
    }
  });
}

export function parseRemoteLocation(response: unknown): RemoteLocation {
  if (!isRecord(response) || response.resourceType !== 'Location') {
    throw new BadGatewayException({
      code: 'SATUSEHAT_LOCATION_RESPONSE_INVALID',
      message: 'Response Location SATUSEHAT tidak valid',
    });
  }

  const externalResourceId = readRecordString(response, 'id');
  if (!externalResourceId) {
    throw new BadGatewayException({
      code: 'SATUSEHAT_LOCATION_RESPONSE_INCOMPLETE',
      message: 'Response Location SATUSEHAT tidak memiliki id',
    });
  }

  const identifier = readIdentifier(response.identifier);
  const physicalType = readFirstCoding(response.physicalType);
  const managingOrganization = readReference(
    response.managingOrganization,
    'Organization',
  );
  const parent = readReference(response.partOf, 'Location');
  const address = readAddress(response.address);
  const position = readPosition(response.position);

  return {
    externalResourceId,
    identifierSystem: identifier?.system,
    identifierValue: identifier?.value,
    name:
      readRecordString(response, 'name') ?? `Location ${externalResourceId}`,
    description: readRecordString(response, 'description'),
    status: readStatus(response.status),
    mode: readMode(response.mode),
    physicalTypeCode: physicalType?.code,
    physicalTypeDisplay: physicalType?.display,
    managingOrganizationExternalResourceId: managingOrganization?.id,
    managingOrganizationDisplay: managingOrganization?.display,
    parentExternalResourceId: parent?.id,
    parentDisplay: parent?.display,
    addressText: address?.text,
    city: address?.city,
    postalCode: address?.postalCode,
    countryCode: address?.countryCode,
    latitude: position?.latitude,
    longitude: position?.longitude,
    altitude: position?.altitude,
  };
}

export function toRemoteSummary(
  record: RemoteLocation,
  links: {
    linkedLocalResourceId?: string;
    parentLinkedLocalResourceId?: string;
  } = {},
): SatusehatLocationRemoteSummary {
  return {
    ...record,
    ...links,
  };
}

function readIdentifier(
  value: unknown,
): { system: string; value: string } | undefined {
  if (!Array.isArray(value)) return undefined;
  const identifiers = value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const system = readRecordString(entry, 'system');
    const identifierValue = readRecordString(entry, 'value');
    return system && identifierValue
      ? [{ system, value: identifierValue }]
      : [];
  });
  return (
    identifiers.find((identifier) =>
      identifier.system.includes('sys-ids.kemkes.go.id/location'),
    ) ?? identifiers[0]
  );
}

function readReference(
  value: unknown,
  resourceType: 'Organization' | 'Location',
): { id: string; display?: string } | undefined {
  if (!isRecord(value)) return undefined;
  const reference = readRecordString(value, 'reference');
  if (!reference) return undefined;
  const match = new RegExp(`^${resourceType}/(.+)$`).exec(reference);
  if (!match) return undefined;
  return {
    id: match[1],
    display: readRecordString(value, 'display'),
  };
}

function readFirstCoding(
  value: unknown,
): { code?: string; display?: string } | undefined {
  const concept: unknown = Array.isArray(value) ? value[0] : value;
  if (!isRecord(concept) || !Array.isArray(concept.coding)) return undefined;
  const coding = concept.coding.find(isRecord);
  if (!coding) return undefined;
  return {
    code: readRecordString(coding, 'code'),
    display: readRecordString(coding, 'display'),
  };
}

function readAddress(value: unknown):
  | {
      text?: string;
      city?: string;
      postalCode?: string;
      countryCode?: string;
    }
  | undefined {
  const address: unknown = Array.isArray(value) ? value[0] : value;
  if (!isRecord(address)) return undefined;

  const text = readRecordString(address, 'text');
  const lines = Array.isArray(address.line)
    ? address.line.filter((line): line is string => typeof line === 'string')
    : [];
  const city = readRecordString(address, 'city');
  const postalCode = readRecordString(address, 'postalCode');
  const countryCode = readRecordString(address, 'country')?.toUpperCase();
  const composedText = [...lines, city, postalCode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');

  return {
    text: (text ?? composedText) || undefined,
    city,
    postalCode,
    countryCode:
      countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined,
  };
}

function readPosition(
  value: unknown,
): { latitude?: number; longitude?: number; altitude?: number } | undefined {
  if (!isRecord(value)) return undefined;
  const latitude = readNumber(value.latitude);
  const longitude = readNumber(value.longitude);
  const altitude = readNumber(value.altitude);
  if (
    latitude === undefined &&
    longitude === undefined &&
    altitude === undefined
  ) {
    return undefined;
  }
  return { latitude, longitude, altitude };
}

function readStatus(value: unknown): RemoteLocationStatus {
  return value === 'suspended' || value === 'inactive' ? value : 'active';
}

function readMode(value: unknown): RemoteLocationMode {
  return value === 'kind' ? 'kind' : 'instance';
}

function readRecordString(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  return optionalText(record[field]);
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
