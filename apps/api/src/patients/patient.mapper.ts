import { Prisma } from '@prisma/client';
import {
  AddressType,
  AddressUse,
  Gender,
  Patient,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
} from '@mitrafaskes/shared';

export const patientInclude = {
  identifiers: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  names: {
    orderBy: { createdAt: 'asc' as const },
  },
  telecoms: {
    orderBy: [{ rank: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  addresses: {
    orderBy: { createdAt: 'asc' as const },
  },
  relationshipsFrom: {
    include: { relatedPerson: true },
    orderBy: [
      { contactPriority: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
} satisfies Prisma.PatientInclude;

export type PatientRecord = Prisma.PatientGetPayload<{
  include: typeof patientInclude;
}>;

const optionalDate = (value: Date | null): string | undefined =>
  value?.toISOString();

export function toPatient(record: PatientRecord): Patient {
  return {
    id: record.id,
    nik: record.nik ?? undefined,
    fullName: record.fullName,
    birthDate: record.birthDate.toISOString().slice(0, 10),
    gender: record.gender as Gender,
    address: record.address ?? undefined,
    phone: record.phone ?? undefined,
    medicalRecNo: record.medicalRecNo,
    integrations: [],
    active: record.active,
    birthPlaceText: record.birthPlaceText ?? undefined,
    multipleBirthOrder: record.multipleBirthOrder ?? undefined,
    deceasedAt: optionalDate(record.deceasedAt),
    maritalStatusCode: record.maritalStatusCode ?? undefined,
    citizenshipCode: record.citizenshipCode ?? undefined,
    version: record.version,
    identifiers: record.identifiers.map((identifier) => ({
      id: identifier.id,
      type: identifier.type as PatientIdentifierType,
      system: identifier.system,
      value: identifier.value,
      normalizedValue: identifier.normalizedValue,
      verificationStatus: identifier.verificationStatus as VerificationStatus,
      isPrimary: identifier.isPrimary,
      active: identifier.active,
      issuer: identifier.issuer ?? undefined,
      validFrom: optionalDate(identifier.validFrom),
      validTo: optionalDate(identifier.validTo),
    })),
    names: record.names.map((name) => ({
      id: name.id,
      use: name.use as PatientNameUse,
      text: name.text,
      given: name.given,
      family: name.family ?? undefined,
      prefix: name.prefix,
      suffix: name.suffix,
      validFrom: optionalDate(name.validFrom),
      validTo: optionalDate(name.validTo),
    })),
    telecoms: record.telecoms.map((telecom) => ({
      id: telecom.id,
      system: telecom.system as TelecomSystem,
      value: telecom.value,
      normalizedValue: telecom.normalizedValue,
      use: telecom.use as TelecomUse,
      rank: telecom.rank,
      verificationStatus: telecom.verificationStatus as VerificationStatus,
      active: telecom.active,
      validFrom: optionalDate(telecom.validFrom),
      validTo: optionalDate(telecom.validTo),
    })),
    addresses: record.addresses.map((address) => ({
      id: address.id,
      use: address.use as AddressUse,
      type: address.type as AddressType,
      text: address.text ?? undefined,
      lines: address.lines,
      postalCode: address.postalCode ?? undefined,
      countryCode: address.countryCode ?? undefined,
      provinceCode: address.provinceCode ?? undefined,
      provinceName: address.provinceName ?? undefined,
      regencyCode: address.regencyCode ?? undefined,
      regencyName: address.regencyName ?? undefined,
      districtCode: address.districtCode ?? undefined,
      districtName: address.districtName ?? undefined,
      villageCode: address.villageCode ?? undefined,
      villageName: address.villageName ?? undefined,
      active: address.active,
      validFrom: optionalDate(address.validFrom),
      validTo: optionalDate(address.validTo),
    })),
    relationships: record.relationshipsFrom.map((relationship) => ({
      id: relationship.id,
      relationshipCode:
        relationship.relationshipCode as PatientRelationshipCode,
      relatedPatientId: relationship.relatedPatientId ?? undefined,
      relatedPersonId: relationship.relatedPersonId ?? undefined,
      relatedPerson: relationship.relatedPerson
        ? {
            id: relationship.relatedPerson.id,
            fullName: relationship.relatedPerson.fullName,
            gender: relationship.relatedPerson.gender
              ? (relationship.relatedPerson.gender as Gender)
              : undefined,
            birthDate: relationship.relatedPerson.birthDate
              ?.toISOString()
              .slice(0, 10),
            phone: relationship.relatedPerson.phone ?? undefined,
            email: relationship.relatedPerson.email ?? undefined,
            addressText: relationship.relatedPerson.addressText ?? undefined,
          }
        : undefined,
      startAt: optionalDate(relationship.startAt),
      endAt: optionalDate(relationship.endAt),
      isGuardian: relationship.isGuardian,
      contactPriority: relationship.contactPriority ?? undefined,
      active: relationship.active,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
