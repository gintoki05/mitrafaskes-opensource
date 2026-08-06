import type {
  LocationSummary,
  SatusehatLocationContext,
} from '@mitrafaskes/shared';
import { SatusehatLocationTransformer } from './location-transformer';

const timestamps = {
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

const location = (
  overrides: Partial<LocationSummary> = {},
): LocationSummary => ({
  id: 'location-local-1',
  organizationId: 'org-local-1',
  parentId: 'location-parent',
  code: 'ROOM-01',
  name: 'Ruang Pemeriksaan 1',
  type: 'ROOM',
  description: 'Ruang konsultasi',
  status: 'ACTIVE',
  mode: 'INSTANCE',
  physicalTypeCode: 'RO',
  addressText: 'Jl. Sehat No. 1',
  city: 'Jakarta',
  postalCode: '12950',
  countryCode: 'ID',
  latitude: -6.231154,
  longitude: 106.832398,
  altitude: 12,
  active: true,
  ...timestamps,
  ...overrides,
});

const context = (
  overrides: Partial<SatusehatLocationContext> = {},
): SatusehatLocationContext => ({
  location: location(),
  organizationExternalId: '100000004',
  organizationDisplay: 'Klinik Mitra Sehat',
  parentExternalId: 'location-parent-external',
  parentDisplay: 'Gedung Utama',
  externalResourceId: 'location-external-1',
  ...overrides,
});

describe('SatusehatLocationTransformer', () => {
  it('maps a linked Location to the SATUSEHAT FHIR contract', () => {
    expect(SatusehatLocationTransformer.transform(context())).toEqual({
      resourceType: 'Location',
      id: 'location-external-1',
      identifier: [
        {
          use: 'official',
          system: 'http://sys-ids.kemkes.go.id/location/100000004',
          value: 'ROOM-01',
        },
      ],
      status: 'active',
      name: 'Ruang Pemeriksaan 1',
      description: 'Ruang konsultasi',
      mode: 'instance',
      physicalType: {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/location-physical-type',
            code: 'ro',
            display: 'Room',
          },
        ],
      },
      address: {
        use: 'work',
        line: ['Jl. Sehat No. 1'],
        city: 'Jakarta',
        postalCode: '12950',
        country: 'ID',
      },
      position: {
        longitude: 106.832398,
        latitude: -6.231154,
        altitude: 12,
      },
      managingOrganization: {
        reference: 'Organization/100000004',
        display: 'Klinik Mitra Sehat',
      },
      partOf: {
        reference: 'Location/location-parent-external',
        display: 'Gedung Utama',
      },
    });
  });

  it('uses local type fallback and forces inactive status for inactive data', () => {
    const payload = SatusehatLocationTransformer.transform(
      context({
        location: location({
          type: 'BUILDING',
          physicalTypeCode: undefined,
          status: 'ACTIVE',
          active: false,
          mode: 'KIND',
          parentId: undefined,
        }),
        parentExternalId: undefined,
        parentDisplay: undefined,
        externalResourceId: undefined,
      }),
    );

    expect(payload.status).toBe('inactive');
    expect(payload.mode).toBe('kind');
    expect(payload.physicalType?.coding[0]).toEqual({
      system: 'http://terminology.hl7.org/CodeSystem/location-physical-type',
      code: 'bu',
      display: 'Building',
    });
    expect(payload).not.toHaveProperty('partOf');
    expect(payload).not.toHaveProperty('id');
  });

  it('omits position when latitude and longitude are both absent', () => {
    const payload = SatusehatLocationTransformer.transform(
      context({
        location: location({ latitude: undefined, longitude: undefined }),
      }),
    );

    expect(payload).not.toHaveProperty('position');
  });

  it('requires latitude and longitude to be provided together', () => {
    expect(() =>
      SatusehatLocationTransformer.transform(
        context({
          location: location({ latitude: undefined }),
        }),
      ),
    ).toThrow('Latitude dan longitude harus diisi bersama-sama');
  });
});
