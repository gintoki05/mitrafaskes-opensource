import type {
  LocationMode,
  LocationStatus,
  LocationType,
  OrganizationType,
} from "@mitrafaskes/shared";

export type OrganizationForm = {
  code: string;
  name: string;
  satusehatId: string;
  type: OrganizationType;
  parentId: string;
  addressText: string;
  phone: string;
  email: string;
  active: boolean;
};

export type LocationForm = {
  organizationId: string;
  parentId: string;
  code: string;
  name: string;
  satusehatId: string;
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

export type SubmittingKind = "organization" | "location";

export type SubmitHandler<T> = (input: T) => Promise<boolean>;

export type FormMode = "create" | "edit";
