export type IntegrationProviderStatus =
  | 'DISABLED'
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'ERROR';

export type IntegrationSyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type IntegrationFailureCategory =
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'TRANSIENT'
  | 'VALIDATION'
  | 'DUPLICATE'
  | 'REFERENCE_MISSING'
  | 'TERMINOLOGY'
  | 'CONFIGURATION'
  | 'UNKNOWN';

export type IntegrationOperatorAction =
  | 'CHECK_CREDENTIALS'
  | 'RETRY_WITH_BACKOFF'
  | 'RECONCILE'
  | 'FIX_REFERENCE'
  | 'FIX_TERMINOLOGY'
  | 'FIX_PAYLOAD'
  | 'CHECK_CONFIGURATION'
  | 'INVESTIGATE';

export interface ResourceIntegrationLinkage {
  externalResourceId: string;
  lastSyncedAt?: string;
}

export interface ResourceIntegrationSync {
  status: IntegrationSyncStatus;
  errorMessage?: string;
  updatedAt: string;
  errorCode?: string;
  httpStatus?: number;
  errorCategory?: IntegrationFailureCategory;
  retryable?: boolean;
  operatorAction?: IntegrationOperatorAction;
  retryAfterAt?: string;
  backoffMs?: number;
  retryAttempt?: number;
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
  errorCode?: string;
  httpStatus?: number;
  errorCategory?: IntegrationFailureCategory;
  retryable?: boolean;
  operatorAction?: IntegrationOperatorAction;
  retryAfterAt?: string;
  backoffMs?: number;
  retryAttempt?: number;
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

export type IntegrationReconciliationIssueCode =
  | 'LINKAGE_WITHOUT_SUCCESS_LOG'
  | 'SUCCESS_LOG_WITHOUT_LINKAGE'
  | 'SUCCESS_LOG_LINKAGE_MISMATCH'
  | 'STALE_PENDING_LOG';

export interface IntegrationReconciliationIssue {
  code: IntegrationReconciliationIssueCode;
  severity: 'WARNING' | 'ERROR';
  resourceType: string;
  resourceId: string;
  externalResourceId?: string;
  message: string;
}

export interface IntegrationReconciliationResponse {
  provider: string;
  environment: string;
  checkedAt: string;
  checkedLinks: number;
  checkedLogs: number;
  issues: IntegrationReconciliationIssue[];
}
