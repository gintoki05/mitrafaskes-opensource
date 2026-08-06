import { Prisma } from '@prisma/client';
import type { LocationSummary } from '@mitrafaskes/shared';

export function toLocationSummary(
  record: Prisma.LocationGetPayload<Prisma.LocationDefaultArgs>,
): LocationSummary {
  return {
    id: record.id,
    organizationId: record.organizationId,
    serviceUnitId: record.serviceUnitId ?? undefined,
    parentId: record.parentId ?? undefined,
    code: record.code,
    name: record.name,
    type: record.type,
    description: record.description ?? undefined,
    status: record.status,
    mode: record.mode,
    physicalTypeCode: record.physicalTypeCode ?? undefined,
    addressText: record.addressText ?? undefined,
    city: record.city ?? undefined,
    postalCode: record.postalCode ?? undefined,
    countryCode: record.countryCode,
    latitude: toNumber(record.latitude),
    longitude: toNumber(record.longitude),
    altitude: toNumber(record.altitude),
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'object' || value === null || !('toNumber' in value)) {
    return undefined;
  }

  const decimal = value as { toNumber?: () => number };
  return typeof decimal.toNumber === 'function'
    ? decimal.toNumber()
    : undefined;
}
