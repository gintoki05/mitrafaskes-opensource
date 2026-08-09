export const MASTER_WILAYAH_SNAPSHOT_VERSION = '2026.08-baseline-1';

export type MasterRegionSeedLevel =
  | 'PROVINCE'
  | 'REGENCY'
  | 'DISTRICT'
  | 'VILLAGE';

export interface MasterRegionSeedRecord {
  level: MasterRegionSeedLevel;
  code: string;
  parentCode?: string;
  bpsCode?: string;
  name: string;
}

/**
 * A small, versioned offline baseline. It deliberately contains a complete
 * hierarchy for representative provinces so a fresh installation can browse
 * the feature before the first provider refresh. A successful refresh can
 * replace this baseline with the provider's full dataset atomically.
 */
export const MASTER_WILAYAH_SNAPSHOT: readonly MasterRegionSeedRecord[] = [
  { level: 'PROVINCE', code: '11', bpsCode: '11', name: 'Aceh' },
  {
    level: 'REGENCY',
    code: '1103',
    parentCode: '11',
    bpsCode: '1105',
    name: 'Kab. Aceh Timur',
  },
  {
    level: 'DISTRICT',
    code: '110301',
    parentCode: '1103',
    bpsCode: '1105140',
    name: 'Darul Aman',
  },
  {
    level: 'VILLAGE',
    code: '1103012002',
    parentCode: '110301',
    bpsCode: '1105140007',
    name: 'Alue Luddin Dua',
  },
  { level: 'PROVINCE', code: '31', bpsCode: '31', name: 'DKI Jakarta' },
  {
    level: 'REGENCY',
    code: '3171',
    parentCode: '31',
    name: 'Kota Administrasi Jakarta Selatan',
  },
  {
    level: 'DISTRICT',
    code: '317101',
    parentCode: '3171',
    name: 'Kebayoran Baru',
  },
  {
    level: 'VILLAGE',
    code: '3171011001',
    parentCode: '317101',
    name: 'Selong',
  },
  { level: 'PROVINCE', code: '32', bpsCode: '32', name: 'Jawa Barat' },
  {
    level: 'REGENCY',
    code: '3273',
    parentCode: '32',
    name: 'Kota Bandung',
  },
  {
    level: 'DISTRICT',
    code: '327301',
    parentCode: '3273',
    name: 'Bandung Kulon',
  },
  {
    level: 'VILLAGE',
    code: '3273011001',
    parentCode: '327301',
    name: 'Cibuntu',
  },
];
