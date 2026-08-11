export type IntegrationProviderStatus =
  | 'DISABLED'
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'ERROR';

export type IntegrationSyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface ResourceIntegrationLinkage {
  externalResourceId: string;
  lastSyncedAt?: string;
}

export interface ResourceIntegrationSync {
  status: IntegrationSyncStatus;
  errorMessage?: string;
  updatedAt: string;
}

/**
 * Provider-neutral integration state attached to a local domain resource.
 * Provider adapters translate their own linkage and log models to this shape.
 */
export interface ResourceIntegrationSummary {
  provider: string;
  environment: string;
  linkage?: ResourceIntegrationLinkage;
  latestSync?: ResourceIntegrationSync;
}

export interface IntegrationCapability {
  provider: string;
  displayName: string;
  enabled: boolean;
  status: IntegrationProviderStatus;
  environment: string;
  resources: string[];
  operations: string[];
}

export interface IntegrationCapabilitiesResponse {
  integrations: IntegrationCapability[];
}

export interface IntegrationConnectionResponse extends IntegrationCapability {
  connection?: Record<string, unknown>;
}

export interface IntegrationLog {
  id: string;
  provider: string;
  environment: string;
  resourceType: string;
  resourceId: string;
  status: IntegrationSyncStatus;
  externalResourceId?: string;
  errorMessage?: string;
  updatedAt: string;
  payload?: unknown;
}

export interface IntegrationLogListResponse {
  items: IntegrationLog[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}
