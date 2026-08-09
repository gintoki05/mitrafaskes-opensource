import type { MasterDataListMeta } from "./master-data";

/**
 * Provider-neutral catalog domains. A domain may be backed by a local
 * snapshot, a manual import, or an external reference provider.
 */
export type MasterDataDomain =
  "WILAYAH" | "MPI" | "MSI" | "MARITAL_STATUS" | "ICD10" | "KFA";

export type MasterDataImportStatus = "PENDING" | "SUCCESS" | "FAILED";

export type MasterDataSource = "LOCAL_SNAPSHOT" | "SATUSEHAT" | "MANUAL_IMPORT";

/**
 * Provider-neutral codes for the local marital-status terminology. The values
 * follow the HL7 v3 marital-status vocabulary without making the local lookup
 * depend on a remote terminology service.
 */
export enum MaritalStatusCode {
  ANNULLED = "A",
  DIVORCED = "D",
  INTERLOCUTORY = "I",
  LEGALLY_SEPARATED = "L",
  MARRIED = "M",
  POLYGAMOUS = "P",
  NEVER_MARRIED = "S",
  DOMESTIC_PARTNER = "T",
  UNMARRIED = "U",
  WIDOWED = "W",
}

export type RegionLevel = "PROVINCE" | "REGENCY" | "DISTRICT" | "VILLAGE";

export interface RegionSummary {
  code: string;
  parentCode?: string;
  name: string;
  level: RegionLevel;
  bpsCode?: string;
  active: boolean;
  source: MasterDataSource | string;
  sourceVersion?: string;
  updatedAt?: string;
}

export interface MaritalStatusSummary {
  code: MaritalStatusCode | string;
  display: string;
  active: boolean;
  displayOrder: number;
  source: MasterDataSource | string;
  sourceVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegionDetail {
  item: RegionSummary;
  children: RegionSummary[];
}

export type MasterDataDatasetReadiness = "EMPTY" | "READY" | "FAILED";

export interface MasterDataDatasetStatus {
  domain: MasterDataDomain;
  label: string;
  readiness: MasterDataDatasetReadiness;
  activeRecordCount: number;
  source?: MasterDataSource | string;
  sourceVersion?: string;
  lastAttemptAt?: string;
  lastSuccessfulAt?: string;
  lastError?: {
    code: string;
    message: string;
  };
}

export interface MasterDataImportRunSummary {
  id: string;
  domain: MasterDataDomain;
  source: MasterDataSource | string;
  sourceVersion?: string;
  status: MasterDataImportStatus;
  recordsSeen: number;
  recordsUpserted: number;
  recordsDeactivated: number;
  attemptedAt: string;
  completedAt?: string;
  succeededAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface MasterDataRegionsResponse {
  items: RegionSummary[];
  meta: MasterDataListMeta;
}

export interface MasterDataRefreshResponse {
  dataset: MasterDataDatasetStatus;
  importRun: MasterDataImportRunSummary;
}

export interface MasterDataRefreshErrorResponse {
  code?: string;
  message?: string | string[];
  statusCode?: number;
  error?: string;
  dataset?: MasterDataDatasetStatus;
  importRun?: MasterDataImportRunSummary;
}
