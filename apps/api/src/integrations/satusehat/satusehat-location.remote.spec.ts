import {
  parseRemoteLocation,
  parseSearchResponse,
} from './satusehat-location.remote';

describe('satusehat-location.remote', () => {
  it('parses Location FHIR fields used for link and import', () => {
    expect(
      parseRemoteLocation({
        resourceType: 'Location',
        id: 'remote-location-1',
        identifier: [
          {
            system: 'http://sys-ids.kemkes.go.id/location/100000004',
            value: 'POLI-UMUM',
          },
        ],
        status: 'active',
        name: 'Poli Umum',
        description: 'Ruang pelayanan umum',
        mode: 'instance',
        physicalType: {
          coding: [{ code: 'ro', display: 'Room' }],
        },
        managingOrganization: {
          reference: 'Organization/100000004',
          display: 'Klinik Mitra Sehat',
        },
        partOf: {
          reference: 'Location/remote-building',
          display: 'Gedung A',
        },
        address: {
          line: ['Jl. Sehat No. 1'],
          city: 'Jakarta',
          postalCode: '12950',
          country: 'ID',
        },
        position: {
          longitude: 106.8,
          latitude: -6.2,
          altitude: 12.5,
        },
      }),
    ).toEqual({
      externalResourceId: 'remote-location-1',
      identifierSystem: 'http://sys-ids.kemkes.go.id/location/100000004',
      identifierValue: 'POLI-UMUM',
      name: 'Poli Umum',
      description: 'Ruang pelayanan umum',
      status: 'active',
      mode: 'instance',
      physicalTypeCode: 'ro',
      physicalTypeDisplay: 'Room',
      managingOrganizationExternalResourceId: '100000004',
      managingOrganizationDisplay: 'Klinik Mitra Sehat',
      parentExternalResourceId: 'remote-building',
      parentDisplay: 'Gedung A',
      addressText: 'Jl. Sehat No. 1, Jakarta, 12950',
      city: 'Jakarta',
      postalCode: '12950',
      countryCode: 'ID',
      latitude: -6.2,
      longitude: 106.8,
      altitude: 12.5,
    });
  });

  it('parses a FHIR search Bundle and skips incomplete entries', () => {
    expect(
      parseSearchResponse({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Location',
              id: 'remote-1',
              name: 'Gedung A',
            },
          },
          { resource: { resourceType: 'Patient', id: 'not-location' } },
          { resource: { resourceType: 'Location' } },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        externalResourceId: 'remote-1',
        name: 'Gedung A',
        status: 'active',
        mode: 'instance',
      }),
    ]);
  });
});
