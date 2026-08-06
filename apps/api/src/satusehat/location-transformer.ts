import type {
  LocationType,
  SatusehatLocationContext,
  SatusehatLocationPayload,
} from '@mitrafaskes/shared';

const PHYSICAL_TYPE_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/location-physical-type' as const;

const physicalTypes: Record<LocationType, { code: string; display: string }> = {
  BUILDING: { code: 'bu', display: 'Building' },
  FLOOR: { code: 'lvl', display: 'Level' },
  ROOM: { code: 'ro', display: 'Room' },
  OTHER: { code: 'oth', display: 'Other' },
};

const statusFor = (
  active: boolean,
  status: string,
): SatusehatLocationPayload['status'] => {
  if (!active) return 'inactive';
  return status.toLowerCase() as SatusehatLocationPayload['status'];
};

export type LocationTransformInput = SatusehatLocationContext;

export class SatusehatLocationTransformer {
  static transform(input: LocationTransformInput): SatusehatLocationPayload {
    const { location } = input;
    if (location.latitude === undefined || location.longitude === undefined) {
      throw new Error(
        'Latitude dan longitude wajib diisi untuk sinkronisasi Location SATUSEHAT',
      );
    }

    const defaultPhysicalType = physicalTypes[location.type];
    const physicalTypeCode =
      location.physicalTypeCode?.trim().toLowerCase() ||
      defaultPhysicalType.code;
    const physicalTypeDisplay =
      Object.values(physicalTypes).find(
        (physicalType) => physicalType.code === physicalTypeCode,
      )?.display ?? physicalTypeCode;

    const payload: SatusehatLocationPayload = {
      resourceType: 'Location',
      identifier: [
        {
          use: 'official',
          system: `http://sys-ids.kemkes.go.id/location/${input.organizationExternalId}`,
          value: location.code,
        },
      ],
      status: statusFor(location.active, location.status),
      name: location.name,
      mode: location.mode.toLowerCase() as SatusehatLocationPayload['mode'],
      physicalType: {
        coding: [
          {
            system: PHYSICAL_TYPE_SYSTEM,
            code: physicalTypeCode,
            display: physicalTypeDisplay,
          },
        ],
      },
      position: {
        longitude: location.longitude,
        latitude: location.latitude,
      },
      managingOrganization: {
        reference: `Organization/${input.organizationExternalId}`,
        display: input.organizationDisplay,
      },
    };

    if (input.externalResourceId) payload.id = input.externalResourceId;
    if (location.description) payload.description = location.description;
    if (location.altitude !== undefined) {
      payload.position.altitude = location.altitude;
    }

    if (
      location.addressText ||
      location.city ||
      location.postalCode ||
      location.countryCode
    ) {
      payload.address = {
        use: 'work',
        ...(location.addressText ? { line: [location.addressText] } : {}),
        ...(location.city ? { city: location.city } : {}),
        ...(location.postalCode ? { postalCode: location.postalCode } : {}),
        ...(location.countryCode ? { country: location.countryCode } : {}),
      };
    }

    if (input.parentExternalId) {
      payload.partOf = {
        reference: `Location/${input.parentExternalId}`,
        display: input.parentDisplay,
      };
    }

    return payload;
  }
}
