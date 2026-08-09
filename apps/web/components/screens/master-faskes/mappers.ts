import type {
  LocationSummary,
  OrganizationSummary,
} from "@mitrafaskes/shared";
import type { LocationForm, OrganizationForm } from "./types";

export function organizationToForm(
  organization: OrganizationSummary,
): OrganizationForm {
  return {
    code: organization.code,
    name: organization.name,
    satusehatId: organization.satusehat?.externalResourceId ?? "",
    type: organization.type,
    parentId: organization.parentId ?? "",
    addressText: organization.addressText ?? "",
    phone: organization.phone ?? "",
    email: organization.email ?? "",
    active: organization.active,
  };
}

export function locationToForm(location: LocationSummary): LocationForm {
  return {
    organizationId: location.organizationId,
    parentId: location.parentId ?? "",
    code: location.code,
    name: location.name,
    satusehatId: location.satusehat?.externalResourceId ?? "",
    type: location.type,
    description: location.description ?? "",
    status: location.status,
    mode: location.mode,
    physicalTypeCode: location.physicalTypeCode ?? "",
    addressText: location.addressText ?? "",
    city: location.city ?? "",
    postalCode: location.postalCode ?? "",
    countryCode: location.countryCode,
    latitude: location.latitude?.toString() ?? "",
    longitude: location.longitude?.toString() ?? "",
    altitude: location.altitude?.toString() ?? "",
    active: location.active,
  };
}
