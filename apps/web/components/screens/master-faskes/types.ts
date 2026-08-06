import type {
  LocationMode,
  LocationStatus,
  LocationType,
  OrganizationType,
  ServiceUnitType,
} from "@mitrafaskes/shared";

export type OrganizationForm = {
  code: string;
  name: string;
  type: OrganizationType;
  parentId: string;
  addressText: string;
  phone: string;
  email: string;
  active: boolean;
};

export type ServiceUnitForm = {
  organizationId: string;
  parentId: string;
  code: string;
  name: string;
  type: ServiceUnitType;
  active: boolean;
};

export type LocationForm = {
  organizationId: string;
  serviceUnitId: string;
  parentId: string;
  code: string;
  name: string;
  type: LocationType;
  description: string;
  status: LocationStatus;
  mode: LocationMode;
  physicalTypeCode: string;
  addressText: string;
  city: string;
  postalCode: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  altitude: string;
  active: boolean;
};

export type SubmittingKind = "organization" | "unit" | "location";

export type SubmitHandler<T> = (input: T) => Promise<boolean>;

export type FormMode = "create" | "edit";
