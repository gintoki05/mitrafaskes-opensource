import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import type {
  LocationForm,
  OrganizationForm,
  ServiceUnitForm,
} from "./types";

export function organizationToForm(
  organization: OrganizationSummary,
): OrganizationForm {
  return {
    code: organization.code,
    name: organization.name,
    type: organization.type,
    parentId: organization.parentId ?? "",
    addressText: organization.addressText ?? "",
    phone: organization.phone ?? "",
    email: organization.email ?? "",
    active: organization.active,
  };
}

export function serviceUnitToForm(
  serviceUnit: ServiceUnitSummary,
): ServiceUnitForm {
  return {
    organizationId: serviceUnit.organizationId,
    parentId: serviceUnit.parentId ?? "",
    code: serviceUnit.code,
    name: serviceUnit.name,
    type: serviceUnit.type,
    active: serviceUnit.active,
  };
}

export function locationToForm(location: LocationSummary): LocationForm {
  return {
    organizationId: location.organizationId,
    serviceUnitId: location.serviceUnitId ?? "",
    parentId: location.parentId ?? "",
    code: location.code,
    name: location.name,
    type: location.type,
    description: location.description ?? "",
    status: location.status,
    mode: location.mode,
    physicalTypeCode: location.physicalTypeCode ?? "",
    addressText: location.addressText ?? "",
    city: location.city ?? "",
    postalCode: location.postalCode ?? "",
    countryCode: location.countryCode,
    active: location.active,
  };
}

