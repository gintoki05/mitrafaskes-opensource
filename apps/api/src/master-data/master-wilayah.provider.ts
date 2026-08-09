import type {
  MasterDataSource,
  RegionLevel,
} from '@mitrafaskes/shared';

export const MASTER_WILAYAH_PROVIDER = 'MASTER_WILAYAH_PROVIDER';

export interface MasterWilayahProviderRecord {
  level: RegionLevel;
  code: string;
  parentCode?: string;
  bpsCode?: string;
  name: string;
}

export interface MasterWilayahSnapshot {
  source: MasterDataSource | string;
  sourceVersion: string;
  complete: boolean;
  records: readonly MasterWilayahProviderRecord[];
}

export interface MasterWilayahProvider {
  fetchSnapshot(): Promise<MasterWilayahSnapshot>;
}

export class MasterDataProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 503,
  ) {
    super(message);
    this.name = 'MasterDataProviderError';
  }
}
