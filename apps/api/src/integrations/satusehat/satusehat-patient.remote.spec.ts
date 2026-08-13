import {
  parseRemotePatient,
  parseSearchResponse,
} from './satusehat-patient.remote';

describe('SATUSEHAT Patient remote parser', () => {
  it('maps a Patient Bundle and prefers the IHS identifier over a UUID', () => {
    expect(
      parseSearchResponse({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: '81dfcb5d-83b2-400f-bfe7-000e6ad38d85',
              active: true,
              gender: 'male',
              birthDate: '1990-01-01',
              identifier: [
                {
                  system: 'https://fhir.kemkes.go.id/id/ihs-number',
                  value: 'P10000001',
                },
                {
                  system: 'https://fhir.kemkes.go.id/id/nik',
                  value: '7209061211900001',
                },
              ],
              name: [{ use: 'official', text: 'Siti Sehat' }],
            },
          },
        ],
      }),
    ).toEqual([
      {
        externalResourceId: 'P10000001',
        name: 'Siti Sehat',
        active: true,
        gender: 'male',
        birthDate: '1990-01-01',
        identifiers: [
          {
            system: 'https://fhir.kemkes.go.id/id/ihs-number',
            value: 'P10000001',
          },
          {
            system: 'https://fhir.kemkes.go.id/id/nik',
            value: '7209061211900001',
          },
        ],
      },
    ]);
  });

  it('composes a name when FHIR only supplies given and family', () => {
    expect(
      parseRemotePatient({
        resourceType: 'Patient',
        id: 'P10000002',
        name: [{ prefix: ['Ny.'], given: ['Olivia'], family: 'Kirana' }],
      }),
    ).toMatchObject({
      externalResourceId: 'P10000002',
      name: 'Ny. Olivia Kirana',
      active: true,
    });
  });

  it('rejects a Patient response without an external identifier', () => {
    expect(() => parseRemotePatient({ resourceType: 'Patient' })).toThrow(
      'Response Patient SATUSEHAT tidak memiliki ID IHS atau id',
    );
  });
});
