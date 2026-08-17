import { DynamicModule, Global, Module } from '@nestjs/common';
import { IntegrationGatewayController } from './integration-gateway.controller';
import { IntegrationMasterWilayahProvider } from './integration-master-wilayah.provider';
import { IntegrationRegistry } from './integration-registry';
import { INTEGRATION_CORE_OPTIONS } from './integration.tokens';
import type { IntegrationCoreOptions } from './integration.types';

@Global()
@Module({})
export class IntegrationCoreModule {
  static register(options: IntegrationCoreOptions): DynamicModule {
    return {
      module: IntegrationCoreModule,
      controllers: [IntegrationGatewayController],
      providers: [
        { provide: INTEGRATION_CORE_OPTIONS, useValue: options },
        IntegrationRegistry,
        IntegrationMasterWilayahProvider,
      ],
      exports: [
        INTEGRATION_CORE_OPTIONS,
        IntegrationRegistry,
        IntegrationMasterWilayahProvider,
      ],
    };
  }
}
