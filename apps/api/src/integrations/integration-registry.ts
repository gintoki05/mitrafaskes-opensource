import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  IntegrationCapabilitiesResponse,
  IntegrationCapability,
  IntegrationConnectionSummary,
  IntegrationConnectionResponse,
  IntegrationLogListResponse,
  IntegrationReconciliationResponse,
  ResourceIntegrationSummary,
} from '@mitrafaskes/shared';
import { INTEGRATION_CORE_OPTIONS } from './integration.tokens';
import type {
  IntegrationCoreOptions,
  IntegrationPlugin,
  IntegrationProviderDefinition,
  IntegrationRetryOptions,
  IntegrationResourceHandler,
  RegisteredIntegrationResourceHandler,
} from './integration.types';

export class IntegrationProviderNotFoundError extends NotFoundException {
  constructor(provider: string) {
    super({
      code: 'INTEGRATION_PROVIDER_NOT_FOUND',
      message: `Provider integrasi ${provider} tidak ditemukan`,
    });
  }
}

export class IntegrationDisabledError extends ServiceUnavailableException {
  constructor(provider: string) {
    super({
      code: 'INTEGRATION_DISABLED',
      message: `Integrasi ${provider} sedang dinonaktifkan`,
    });
  }
}

@Injectable()
export class IntegrationRegistry {
  private readonly definitions = new Map<
    string,
    IntegrationProviderDefinition
  >();
  private readonly plugins = new Map<string, IntegrationPlugin>();

  constructor(
    @Inject(INTEGRATION_CORE_OPTIONS)
    options: IntegrationCoreOptions,
  ) {
    for (const provider of options.providers) {
      this.definitions.set(this.normalizeProvider(provider.provider), provider);
    }
  }

  register(plugin: IntegrationPlugin): void {
    this.plugins.set(this.normalizeProvider(plugin.provider), plugin);
  }

  async getCapabilities(): Promise<IntegrationCapabilitiesResponse> {
    const integrations: IntegrationCapability[] = [];
    for (const definition of this.definitions.values()) {
      const plugin = this.plugins.get(
        this.normalizeProvider(definition.provider),
      );
      integrations.push(
        plugin
          ? await plugin.getConnectionStatus()
          : {
              ...definition,
              enabled: false,
              status: 'DISABLED',
            },
      );
    }
    return { integrations };
  }

  async getConnectionSummary(
    providerInput: string,
  ): Promise<IntegrationConnectionSummary> {
    const definition = this.getDefinition(providerInput);
    const provider = this.normalizeProvider(definition.provider);
    const plugin = this.plugins.get(provider);

    if (!plugin) {
      return {
        provider: definition.provider,
        displayName: definition.displayName,
        enabled: false,
        status: 'DISABLED',
        environment: definition.environment,
      };
    }

    const connection = await plugin.getConnectionStatus();
    return {
      provider: connection.provider,
      displayName: connection.displayName,
      enabled: connection.enabled,
      status: connection.status,
      environment: connection.environment,
    };
  }

  getDefinition(providerInput: string): IntegrationProviderDefinition {
    const provider = this.normalizeProvider(providerInput);
    const definition = this.definitions.get(provider);
    if (!definition) throw new IntegrationProviderNotFoundError(provider);
    return definition;
  }

  getPlugin(providerInput: string): IntegrationPlugin {
    const provider = this.normalizeProvider(providerInput);
    this.getDefinition(provider);
    const plugin = this.plugins.get(provider);
    if (!plugin) throw new IntegrationDisabledError(provider);
    return plugin;
  }

  async getConnectionStatus(
    provider: string,
  ): Promise<IntegrationConnectionResponse> {
    return this.getPlugin(provider).getConnectionStatus();
  }

  async listLogs(
    provider: string,
    input: { page: number; pageSize: number; includePayload: boolean },
  ): Promise<IntegrationLogListResponse> {
    return this.getPlugin(provider).listLogs(input);
  }

  retryLog(
    provider: string,
    logId: string,
    options: IntegrationRetryOptions = { includePayload: false },
  ): Promise<unknown> {
    return this.getPlugin(provider).retryLog(logId, options);
  }

  reconcile(provider: string): Promise<IntegrationReconciliationResponse> {
    const plugin = this.getPlugin(provider);
    if (!plugin.reconcile) {
      throw new NotFoundException({
        code: 'INTEGRATION_OPERATION_NOT_FOUND',
        message: `Rekonsiliasi tidak didukung oleh provider ${provider}`,
      });
    }
    return plugin.reconcile();
  }

  getResourceHandler(
    provider: string,
    resourceType: string,
  ): IntegrationResourceHandler {
    const handler = this.getPlugin(provider).getResourceHandler(resourceType);
    if (!handler) {
      throw new NotFoundException({
        code: 'INTEGRATION_RESOURCE_NOT_FOUND',
        message: `Resource ${resourceType} tidak didukung oleh provider ${provider}`,
      });
    }
    return handler;
  }

  getRegisteredResourceHandlers(
    resourceType: string,
  ): RegisteredIntegrationResourceHandler[] {
    const handlers: RegisteredIntegrationResourceHandler[] = [];
    for (const plugin of this.plugins.values()) {
      const handler = plugin.getResourceHandler(resourceType);
      if (handler) handlers.push({ provider: plugin.provider, handler });
    }
    return handlers;
  }

  async findResourceSummaries(
    resourceType: string,
    localResourceIds: readonly string[],
  ): Promise<Map<string, ResourceIntegrationSummary[]>> {
    const result = new Map<string, ResourceIntegrationSummary[]>();
    if (localResourceIds.length === 0) return result;

    for (const plugin of this.plugins.values()) {
      const summaries = await plugin.getResourceSummaries(
        resourceType,
        localResourceIds,
      );
      for (const [localResourceId, values] of summaries) {
        result.set(localResourceId, [
          ...(result.get(localResourceId) ?? []),
          ...values,
        ]);
      }
    }
    return result;
  }

  refreshMasterData(provider: string, domain: string): Promise<unknown> {
    const plugin = this.getPlugin(provider);
    if (!plugin.refreshMasterData) {
      throw new NotFoundException({
        code: 'INTEGRATION_OPERATION_NOT_FOUND',
        message: `Refresh master data ${domain} tidak didukung oleh provider ${provider}`,
      });
    }
    return plugin.refreshMasterData(domain);
  }

  fetchMasterDataSnapshot(provider: string, domain: string): Promise<unknown> {
    const plugin = this.getPlugin(provider);
    if (!plugin.fetchMasterDataSnapshot) {
      throw new NotFoundException({
        code: 'INTEGRATION_OPERATION_NOT_FOUND',
        message: `Snapshot master data ${domain} tidak didukung oleh provider ${provider}`,
      });
    }
    return plugin.fetchMasterDataSnapshot(domain);
  }

  private normalizeProvider(provider: string): string {
    return provider.trim().toUpperCase();
  }
}
