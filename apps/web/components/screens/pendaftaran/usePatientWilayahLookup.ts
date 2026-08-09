'use client';

import { useCallback } from 'react';
import type { RegionLevel } from '@mitrafaskes/shared';
import {
  useMasterDataRegions,
  type MasterDataRegionsState,
} from '@/hooks/useMasterDataRegions';

const LOOKUP_PAGE_SIZE = 200;

export interface PatientWilayahLookupState {
  province: MasterDataRegionsState;
  regency: MasterDataRegionsState;
  district: MasterDataRegionsState;
  village: MasterDataRegionsState;
  refresh: () => Promise<void>;
}

type PatientWilayahLookupProps = {
  enabled: boolean;
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
};

function query(level: RegionLevel, parentCode?: string) {
  return {
    level,
    parentCode,
    page: 1,
    pageSize: LOOKUP_PAGE_SIZE,
  } as const;
}

export function usePatientWilayahLookup({
  enabled,
  provinceCode,
  regencyCode,
  districtCode,
}: PatientWilayahLookupProps): PatientWilayahLookupState {
  const province = useMasterDataRegions(query('PROVINCE'), { enabled });
  const regency = useMasterDataRegions(query('REGENCY', provinceCode), {
    enabled: enabled && Boolean(provinceCode),
  });
  const district = useMasterDataRegions(query('DISTRICT', regencyCode), {
    enabled: enabled && Boolean(regencyCode),
  });
  const village = useMasterDataRegions(query('VILLAGE', districtCode), {
    enabled: enabled && Boolean(districtCode),
  });
  const refreshProvince = province.refresh;
  const refreshRegency = regency.refresh;
  const refreshDistrict = district.refresh;
  const refreshVillage = village.refresh;

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshProvince(),
      refreshRegency(),
      refreshDistrict(),
      refreshVillage(),
    ]);
  }, [refreshDistrict, refreshProvince, refreshRegency, refreshVillage]);

  return { province, regency, district, village, refresh };
}
