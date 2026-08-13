import { MasterRegionLevel } from '@prisma/client';
import {
  AddressType,
  AddressUse,
  type PatientAddress,
} from '@mitrafaskes/shared';
import { PatientAddressRegionValidator } from './patient-address-region.validator';
import type { ValidatedPatientAddressInput } from './patient.validation';

const masterRecords = [
  {
    level: MasterRegionLevel.PROVINCE,
    code: '31',
    parentCode: null,
    name: 'DKI Jakarta',
  },
  {
    level: MasterRegionLevel.REGENCY,
    code: '3171',
    parentCode: '31',
    name: 'Jakarta Selatan',
  },
  {
    level: MasterRegionLevel.DISTRICT,
    code: '317101',
    parentCode: '3171',
    name: 'Kebayoran Baru',
  },
  {
    level: MasterRegionLevel.VILLAGE,
    code: '3171011001',
    parentCode: '317101',
    name: 'Selong',
  },
];

function createValidator(records = masterRecords) {
  const findMany = jest.fn().mockResolvedValue(records);
  const validator = new PatientAddressRegionValidator({
    masterRegion: { findMany },
  } as never);
  return { validator, findMany };
}

function address(
  overrides: Partial<ValidatedPatientAddressInput> = {},
): ValidatedPatientAddressInput {
  return {
    use: AddressUse.HOME,
    type: AddressType.PHYSICAL,
    text: 'Jl. Mawar 1',
    lines: [],
    active: true,
    ...overrides,
  };
}

function patientAddress(
  overrides: Partial<PatientAddress> = {},
): PatientAddress {
  return {
    id: 'address-1',
    use: AddressUse.HOME,
    type: AddressType.PHYSICAL,
    lines: [],
    active: true,
    ...overrides,
  };
}

describe('PatientAddressRegionValidator', () => {
  it('canonicalizes valid codes and fills canonical names', async () => {
    const { validator, findMany } = createValidator();

    const [result] = await validator.canonicalize(
      [
        address({
          provinceCode: '31',
          regencyCode: '3171',
          districtCode: '317101',
          villageCode: '3171011001',
        }),
      ],
      { mode: 'CREATE' },
    );

    expect(result).toEqual(
      expect.objectContaining({
        provinceName: 'DKI Jakarta',
        regencyName: 'Jakarta Selatan',
        districtName: 'Kebayoran Baru',
        villageName: 'Selong',
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          code: { in: ['31', '3171', '317101', '3171011001'] },
        },
      }),
    );
  });

  it('rejects a mismatched name and parent hierarchy', async () => {
    const { validator } = createValidator(
      masterRecords.map((record) =>
        record.level === MasterRegionLevel.REGENCY
          ? { ...record, parentCode: '99' }
          : record,
      ),
    );

    await expect(
      validator.canonicalize(
        [
          address({
            provinceCode: '31',
            provinceName: 'Provinsi Manual',
            regencyCode: '3171',
            regencyName: 'Jakarta Selatan',
            districtCode: '317101',
            districtName: 'Kebayoran Baru',
          }),
        ],
        { mode: 'CREATE' },
      ),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({
          field: 'addresses[0].provinceName',
          code: 'REGION_NAME_MISMATCH',
        }),
        expect.objectContaining({
          field: 'addresses[0].regencyCode',
          code: 'REGION_PARENT_MISMATCH',
        }),
      ]),
    });
  });

  it('rejects manual region names on create', async () => {
    const { validator } = createValidator([]);

    await expect(
      validator.canonicalize([address({ provinceName: 'Provinsi Manual' })], {
        mode: 'CREATE',
      }),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          field: 'addresses[0].provinceCode',
          code: 'REGION_CODE_REQUIRED',
        }),
      ],
    });
  });

  it('preserves an unchanged legacy region during update', async () => {
    const { validator } = createValidator([]);
    const legacy = address({
      provinceCode: '99',
      provinceName: 'Provinsi Legacy',
    });

    await expect(
      validator.canonicalize([legacy], {
        mode: 'UPDATE',
        previousAddresses: [
          patientAddress({
            provinceCode: '99',
            provinceName: 'Provinsi Legacy',
          }),
        ],
      }),
    ).resolves.toEqual([legacy]);
  });

  it('rejects a changed invalid legacy region during update', async () => {
    const { validator } = createValidator([]);

    await expect(
      validator.canonicalize(
        [address({ provinceCode: '98', provinceName: 'Provinsi Baru' })],
        {
          mode: 'UPDATE',
          previousAddresses: [
            patientAddress({
              provinceCode: '99',
              provinceName: 'Provinsi Legacy',
            }),
          ],
        },
      ),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          field: 'addresses[0].provinceCode',
          code: 'REGION_NOT_FOUND',
        }),
      ],
    });
  });
});
