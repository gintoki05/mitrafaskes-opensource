import {
  MasterRegionValidationError,
  validateMasterWilayahSnapshot,
} from './master-wilayah.validation';

describe('Master Wilayah validation', () => {
  it('normalizes text and accepts a complete parent hierarchy', () => {
    expect(
      validateMasterWilayahSnapshot([
        { level: 'province', code: ' 11 ', name: '  Aceh  ' },
        {
          level: 'REGENCY',
          code: '1103',
          parentCode: '11',
          name: 'Kab. Aceh Timur',
        },
        {
          level: 'DISTRICT',
          code: '110301',
          parentCode: '1103',
          name: 'Darul Aman',
        },
        {
          level: 'VILLAGE',
          code: '1103012002',
          parentCode: '110301',
          name: 'Alue Luddin Dua',
        },
      ]),
    ).toEqual([
      {
        level: 'PROVINCE',
        code: '11',
        name: 'Aceh',
        parentCode: undefined,
        bpsCode: undefined,
      },
      {
        level: 'REGENCY',
        code: '1103',
        parentCode: '11',
        name: 'Kab. Aceh Timur',
        bpsCode: undefined,
      },
      {
        level: 'DISTRICT',
        code: '110301',
        parentCode: '1103',
        name: 'Darul Aman',
        bpsCode: undefined,
      },
      {
        level: 'VILLAGE',
        code: '1103012002',
        parentCode: '110301',
        name: 'Alue Luddin Dua',
        bpsCode: undefined,
      },
    ]);
  });

  it('rejects duplicate codes and missing parents', () => {
    expect(() =>
      validateMasterWilayahSnapshot([
        { level: 'PROVINCE', code: '11', name: 'Aceh' },
        { level: 'PROVINCE', code: '11', name: 'Aceh' },
      ]),
    ).toThrow('Duplikat kode wilayah');

    expect(() =>
      validateMasterWilayahSnapshot([
        {
          level: 'REGENCY',
          code: '1103',
          parentCode: '11',
          name: 'Aceh Timur',
        },
      ]),
    ).toThrow('Parent 11');
  });

  it('rejects empty snapshots and invalid province parents', () => {
    expect(() => validateMasterWilayahSnapshot([])).toThrow(
      MasterRegionValidationError,
    );
    expect(() =>
      validateMasterWilayahSnapshot([
        { level: 'PROVINCE', code: '11', parentCode: '1', name: 'Aceh' },
      ]),
    ).toThrow('tidak boleh memiliki parentCode');
  });
});
