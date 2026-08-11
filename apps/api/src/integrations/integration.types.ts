import type {
  IntegrationCapability,
  IntegrationConnectionResponse,
  IntegrationLogListResponse,
  ResourceIntegrationSummary,
} from '@mitrafaskes/shared';

export type IntegrationQuery = Record<string, string | undefined>;

export interface IntegrationResourceHandler {
  resourceType: string;
  search?(query: IntegrationQuery): Promise<unknown>;
  lookup?(query: IntegrationQuery): Promise<unknown>;
  import?(input: unknown): Promise<unknown>;
  preview?(localResourceId: string): Promise<unknown>;
  sync?(localResourceId: string): Promise<unknown>;
  link?(localResourceId: string, input: unknown): Promise<unknown>;
}

export interface IntegrationPlugin {
  readonly provider: string;
  readonly descriptor: IntegrationCapability;
  getConnectionStatus(): Promise<IntegrationConnectionResponse>;
  listLogs(input: {
    page: number;
    pageSize: number;
    includePayload: boolean;
  }): Promise<IntegrationLogListResponse>;
  retryLog(logId: string): Promise<unknown>;
  getResourceSummaries(
    resourceType: string,
    localResourceIds: readonly string[],
  ): Promise<ReadonlyMap<string, ResourceIntegrationSummary[]>>;
  getResourceHandler(resourceType: string): IntegrationResourceHandler | undefined;
  refreshMasterData?(domain: string): Promise<unknown>;
  fetchMasterDataSnapshot?(domain: string): Promise<unknown>;
}

export interface IntegrationProviderDefinition {
  provider: string;
  displayName: string;
  environment: string;
  resources: string[];
  operations: string[];
}

export interface IntegrationCoreOptions {
  providers: IntegrationProviderDefinition[];
  masterDataProvider?: {
    provider: string;
    domain: string;
  };
}
