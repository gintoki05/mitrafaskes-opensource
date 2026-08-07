import {
  parseRemotePractitioner,
  parseSearchResponse,
} from './satusehat-practitioner.remote';

describe('SATUSEHAT Practitioner remote parser', () => {
  it('maps a Practitioner Bundle into a safe remote summary', () => {
    expect(
      parseSearchResponse({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Practitioner',
              id: '10009880728',
              active: true,
              gender: 'male',
              birthDate: '1994-01-01',
              identifier: [
                {
                  system: 'https://fhir.kemkes.go.id/id/nik',
                  value: '7209061211900001',
                },
              ],
              name: [{ use: 'official', text: 'dr. Alexander' }],
            },
          },
        ],
      }),
    ).toEqual([
      {
        externalResourceId: '10009880728',
        name: 'dr. Alexander',
        active: true,
        gender: 'male',
        birthDate: '1994-01-01',
        identifiers: [
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
      parseRemotePractitioner({
        resourceType: 'Practitioner',
        id: 'N10000001',
        name: [{ prefix: ['dr.'], given: ['Olivia'], family: 'Kirana' }],
      }),
    ).toMatchObject({
      externalResourceId: 'N10000001',
      name: 'dr. Olivia Kirana',
      active: true,
    });
  });

  it('uses the Practitioner HIS number instead of a UUID resource id', () => {
    expect(
      parseSearchResponse({
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'Practitioner',
              id: '81dfcb5d-83b2-400f-bfe7-000e6ad38d85',
              identifier: [
                {
                  system: 'http://sys-ids.kemkes.go.id/practitioner',
                  value: '10009880728',
                },
              ],
              name: [{ text: 'dr. Alexander' }],
            },
          },
          {
            resource: {
              resourceType: 'Practitioner',
              id: 'another-duplicate-id',
              identifier: [
                {
                  system: 'https://fhir.kemkes.go.id/id/nakes-his-number',
                  value: '10009880728',
                },
              ],
            },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        externalResourceId: '10009880728',
        identifiers: [
          {
            system: 'http://sys-ids.kemkes.go.id/practitioner',
            value: '10009880728',
          },
        ],
      }),
    ]);
  });

  it('rejects a detail response without an external ID', () => {
    expect(() =>
      parseRemotePractitioner({ resourceType: 'Practitioner' }),
    ).toThrow('Response Practitioner SATUSEHAT tidak memiliki id');
  });
});
