import { OrganizationSummary } from '@mitrafaskes/shared';
import { SatusehatOrganizationTransformer } from './organization-transformer';

const organization = (
  overrides: Partial<OrganizationSummary> = {},
): OrganizationSummary => ({
  id: 'org-local-1',
  code: 'POLI-UMUM',
  name: 'Poli Umum',
  type: 'SUB_ORGANIZATION',
  parentId: 'org-root',
  addressText: 'Jl. Sehat No. 1',
  phone: '0215555555',
  email: 'poli@example.test',
  active: true,
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
  ...overrides,
});

describe('SatusehatOrganizationTransformer', () => {
  it('maps a sub-organization to the SATUSEHAT FHIR contract', () => {
    const payload = SatusehatOrganizationTransformer.transform({
      organization: organization(),
      rootOrganizationId: '100000004',
      parentExternalId: '100000004',
      parentDisplay: 'Klinik Mitra Sehat',
    });

    expect(payload).toEqual({
      resourceType: 'Organization',
      identifier: [
        {
          use: 'official',
          system: 'http://sys-ids.kemkes.go.id/organization/100000004',
          value: 'POLI-UMUM',
        },
      ],
      active: true,
      type: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/organization-type',
              code: 'dept',
              display: 'Hospital Department',
            },
          ],
        },
      ],
      name: 'Poli Umum',
      telecom: [
        { system: 'phone', value: '0215555555', use: 'work' },
        { system: 'email', value: 'poli@example.test', use: 'work' },
      ],
      address: [
        {
          use: 'work',
          type: 'both',
          text: 'Jl. Sehat No. 1',
          line: ['Jl. Sehat No. 1'],
          country: 'ID',
        },
      ],
      partOf: {
        reference: 'Organization/100000004',
        display: 'Klinik Mitra Sehat',
      },
    });
  });

  it('does not attach a parent to the root facility payload', () => {
    const payload = SatusehatOrganizationTransformer.transform({
      organization: organization({
        id: 'org-root',
        code: 'KLINIK-UTAMA',
        name: 'Klinik Mitra Sehat',
        type: 'HEALTHCARE_FACILITY',
        parentId: undefined,
        phone: undefined,
        email: undefined,
        addressText: undefined,
      }),
      rootOrganizationId: '100000004',
    });

    expect(payload.type[0].coding[0].code).toBe('prov');
    expect(payload).not.toHaveProperty('partOf');
    expect(payload).not.toHaveProperty('telecom');
    expect(payload).not.toHaveProperty('address');
  });
});
