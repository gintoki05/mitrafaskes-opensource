import type {
  LocationMode,
  LocationStatus,
  LocationType,
  OrganizationType,
  ServiceUnitType,
} from "@mitrafaskes/shared";
import type {
  LocationForm,
  OrganizationForm,
  ServiceUnitForm,
} from "./types";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export const organizationTypes: SelectOption<OrganizationType>[] = [
  { value: "HEALTHCARE_FACILITY", label: "Faskes / organisasi induk" },
  { value: "SUB_ORGANIZATION", label: "Sub-organisasi" },
];

export const serviceUnitTypes: SelectOption<ServiceUnitType>[] = [
  { value: "POLYCLINIC", label: "Poli / layanan klinis" },
  { value: "DEPARTMENT", label: "Departemen / unit" },
  { value: "SUPPORT", label: "Unit pendukung" },
  { value: "OTHER", label: "Lainnya" },
];

export const locationTypes: SelectOption<LocationType>[] = [
  { value: "BUILDING", label: "Gedung" },
  { value: "FLOOR", label: "Lantai" },
  { value: "ROOM", label: "Ruangan" },
  { value: "OTHER", label: "Lokasi lain" },
];

export const locationStatuses: SelectOption<LocationStatus>[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
  { value: "INACTIVE", label: "Tidak aktif" },
];

export const locationModes: SelectOption<LocationMode>[] = [
  { value: "INSTANCE", label: "Lokasi spesifik" },
  { value: "KIND", label: "Kelompok lokasi" },
];

export const emptyOrganization: OrganizationForm = {
  code: "",
  name: "",
  type: "HEALTHCARE_FACILITY",
  parentId: "",
  addressText: "",
  phone: "",
  email: "",
  active: true,
};

export const emptyServiceUnit: ServiceUnitForm = {
  organizationId: "",
  parentId: "",
  code: "",
  name: "",
  type: "POLYCLINIC",
  active: true,
};

export const emptyLocation: LocationForm = {
  organizationId: "",
  serviceUnitId: "",
  parentId: "",
  code: "",
  name: "",
  type: "ROOM",
  description: "",
  status: "ACTIVE",
  mode: "INSTANCE",
  physicalTypeCode: "",
  addressText: "",
  city: "",
  postalCode: "",
  countryCode: "ID",
  latitude: "",
  longitude: "",
  altitude: "",
  active: true,
};
