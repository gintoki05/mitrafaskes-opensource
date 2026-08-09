export type OrganizationType = 'HEALTHCARE_FACILITY' | 'SUB_ORGANIZATION';

export type LocationType = 'BUILDING' | 'FLOOR' | 'ROOM' | 'OTHER';

export type LocationStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type LocationMode = 'INSTANCE' | 'KIND';

export interface SatusehatLinkageSummary {
  externalResourceId: string;
  lastSyncedAt?: string;
}

export interface SatusehatSyncSummary {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  updatedAt: string;
}

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
  type: OrganizationType;
  parentId?: string;
  addressText?: string;
  phone?: string;
  email?: string;
  satusehat?: SatusehatLinkageSummary;
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
  satusehat?: SatusehatLinkageSummary;
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
  role: 'DOKTER' | 'PERAWAT';
  nik?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE';
  sipNumber?: string;
  strNumber?: string;
  organization?: PractitionerOrganizationReference;
  location?: PractitionerLocationReference;
  active: boolean;
  satusehat?: SatusehatLinkageSummary;
  satusehatSync?: SatusehatSyncSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerCreateRequest {
  username: string;
  password: string;
  fullName: string;
  role: 'DOKTER' | 'PERAWAT';
  nik?: string | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  sipNumber?: string | null;
  strNumber?: string | null;
  organizationId?: string | null;
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

export interface MasterDataListResponse<T> {
  items: T[];
  meta: MasterDataListMeta;
}
