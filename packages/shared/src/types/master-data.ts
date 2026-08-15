export type OrganizationType = 'HEALTHCARE_FACILITY' | 'SUB_ORGANIZATION';

export type LocationType = 'BUILDING' | 'FLOOR' | 'ROOM' | 'OTHER';

export type LocationStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type LocationMode = 'INSTANCE' | 'KIND';

import type { ResourceIntegrationSummary } from './integrations';

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
  type: OrganizationType;
  parentId?: string;
  addressText?: string;
  phone?: string;
  email?: string;
  integrations: ResourceIntegrationSummary[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSummary {
  id: string;
  organizationId: string;
  parentId?: string;
  code: string;
  name: string;
  type: LocationType;
  description?: string;
  status: LocationStatus;
  mode: LocationMode;
  physicalTypeCode?: string;
  addressText?: string;
  city?: string;
  postalCode?: string;
  countryCode: string;
  integrations: ResourceIntegrationSummary[];
  latitude?: number;
  longitude?: number;
  altitude?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerOrganizationReference {
  id: string;
  code: string;
  name: string;
}

export interface PractitionerLocationReference {
  id: string;
  organizationId: string;
  code: string;
  name: string;
}

export interface PractitionerSummary {
  id: string;
  username: string;
  fullName: string;
  role: 'DOKTER' | 'PERAWAT' | 'PETUGAS_PENDAFTARAN';
  nik?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  sipNumber?: string;
  strNumber?: string;
  organization?: PractitionerOrganizationReference;
  /** Primary/legacy location kept for compatibility with existing consumers. */
  location?: PractitionerLocationReference;
  /** Complete assignment set for this practitioner. */
  locations: PractitionerLocationReference[];
  active: boolean;
  integrations: ResourceIntegrationSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerCreateRequest {
  username: string;
  password: string;
  fullName: string;
  role: 'DOKTER' | 'PERAWAT' | 'PETUGAS_PENDAFTARAN';
  nik?: string | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  sipNumber?: string | null;
  strNumber?: string | null;
  organizationId?: string | null;
  /** Complete location assignment set. An empty array clears all assignments. */
  locationIds?: string[] | null;
  /** @deprecated Use locationIds for new clients. */
  locationId?: string | null;
  active?: boolean;
}

export interface MasterFaskesData {
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
}

export type MasterDataListSort = 'code' | 'name' | 'active' | 'createdAt';

export type MasterDataSortDirection = 'asc' | 'desc';

export interface MasterDataListQuery {
  search?: string;
  active?: boolean;
  type?: string;
  status?: string;
  organizationId?: string;
  locationId?: string;
  role?: 'DOKTER' | 'PERAWAT' | 'PETUGAS_PENDAFTARAN';
  page?: number;
  pageSize?: number;
  sort?: MasterDataListSort;
  direction?: MasterDataSortDirection;
}

export interface MasterDataListMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface MasterDataStatusCounts {
  active: number;
  inactive: number;
}

export interface MasterDataListResponse<T> {
  items: T[];
  meta: MasterDataListMeta;
  statusCounts?: MasterDataStatusCounts;
}
