export type OrganizationType = 'HEALTHCARE_FACILITY' | 'SUB_ORGANIZATION';

export type ServiceUnitType = 'POLYCLINIC' | 'DEPARTMENT' | 'SUPPORT' | 'OTHER';

export type LocationType = 'BUILDING' | 'FLOOR' | 'ROOM' | 'OTHER';

export type LocationStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type LocationMode = 'INSTANCE' | 'KIND';

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
  type: OrganizationType;
  parentId?: string;
  addressText?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceUnitSummary {
  id: string;
  organizationId: string;
  parentId?: string;
  code: string;
  name: string;
  type: ServiceUnitType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSummary {
  id: string;
  organizationId: string;
  serviceUnitId?: string;
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
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterFaskesData {
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
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
  serviceUnitId?: string;
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
