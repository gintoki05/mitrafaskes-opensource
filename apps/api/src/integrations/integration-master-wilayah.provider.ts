import { Inject, Injectable } from '@nestjs/common';
import { MasterDataProviderError } from '../master-data/master-wilayah.provider';
import type {
  MasterWilayahProvider,
  MasterWilayahSnapshot,
} from '../master-data/master-wilayah.provider';
import { IntegrationRegistry } from './integration-registry';
import { INTEGRATION_CORE_OPTIONS } from './integration.tokens';
import type { IntegrationCoreOptions } from './integration.types';

/**
 * The core only knows that a master-data provider can return a snapshot. The
 * provider-specific adapter is registered by an enabled integration plugin.
 */
@Injectable()
export class IntegrationMasterWilayahProvider implements MasterWilayahProvider {
  constructor(
    private readonly integrations: IntegrationRegistry,
    @Inject(INTEGRATION_CORE_OPTIONS)
    private readonly options: IntegrationCoreOptions,
  ) {}

  async fetchSnapshot(): Promise<MasterWilayahSnapshot> {
    const provider = this.options.masterDataProvider;
    if (!provider) {
      throw new MasterDataProviderError(
        'INTEGRATION_DISABLED',
        'Provider master data tidak aktif; data lokal tetap digunakan',
        503,
      );
    }
    try {
      return (await this.integrations.fetchMasterDataSnapshot(
        provider.provider,
        provider.domain,
      )) as MasterWilayahSnapshot;
    } catch (error) {
      if (error instanceof Error && 'getStatus' in error) throw error;
      throw new MasterDataProviderError(
        'INTEGRATION_DISABLED',
        'Provider master wilayah tidak aktif; data wilayah lokal tetap digunakan',
        503,
      );
    }
  }
}
