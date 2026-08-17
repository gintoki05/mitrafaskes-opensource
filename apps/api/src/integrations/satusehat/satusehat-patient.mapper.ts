import { PatientNameUse } from '@mitrafaskes/shared';
import type {
  AddressType,
  AddressUse,
  Patient,
  PatientAddress,
  PatientIdentifier,
  PatientIdentifierType,
  PatientName,
  PatientTelecom,
  TelecomSystem,
  TelecomUse,
  SatusehatPatientAddressPayload,
  SatusehatPatientIdentifierPayload,
  SatusehatPatientNamePayload,
  SatusehatPatientPatchOperation,
  SatusehatPatientPayload,
  SatusehatPatientTelecomPayload,
} from '@mitrafaskes/shared';
import {
  PATIENT_IHS_SYSTEM,
  PATIENT_MOTHER_NIK_SYSTEM,
  PATIENT_NIK_SYSTEM,
} from './patient.constants';

const identifierSystems: Partial<Record<PatientIdentifierType, string>> = {
  NIK: PATIENT_NIK_SYSTEM,
  MOTHER_NIK: PATIENT_MOTHER_NIK_SYSTEM,
  PASSPORT: 'https://fhir.kemkes.go.id/id/paspor',
  FAMILY_CARD: 'https://fhir.kemkes.go.id/id/kk',
};

const PATIENT_ADMINISTRATIVE_CODE_URL =
  'https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode';

export function toSatusehatPatientPayload(
  patient: Patient,
  externalResourceId?: string,
): SatusehatPatientPayload {
  const currentIdentifiers = (patient.identifiers ?? []).filter(
    (identifier) =>
      identifier.active &&
      !identifier.validTo &&
      identifier.system !== PATIENT_IHS_SYSTEM,
  );
  const currentNames = (patient.names ?? []).filter((name) => !name.validTo);
  const currentTelecoms = (patient.telecoms ?? []).filter(
    (telecom) => telecom.active && !telecom.validTo,
  );
  const currentAddresses = (patient.addresses ?? []).filter(
    (address) => address.active && !address.validTo,
  );

  const names = currentNames.length
    ? currentNames.map(toName)
    : [{ use: 'official' as const, text: patient.fullName }];
  const identifiers = currentIdentifiers.length
    ? currentIdentifiers.map(toIdentifier)
    : patient.nik
      ? [
          {
            use: 'official' as const,
            system: PATIENT_NIK_SYSTEM,
            value: patient.nik,
          },
        ]
      : [];
  const payload: SatusehatPatientPayload = {
    resourceType: 'Patient',
    identifier: identifiers,
    active: patient.active !== false,
    name: names,
    gender: patient.gender.toLowerCase() as 'male' | 'female',
    birthDate: patient.birthDate,
  };

  if (patient.multipleBirthOrder !== undefined) {
    payload.multipleBirthInteger = patient.multipleBirthOrder;
  } else {
    payload.multipleBirthBoolean = false;
  }

  if (externalResourceId) payload.id = externalResourceId;

  const telecom = currentTelecoms.length
    ? currentTelecoms.map(toTelecom)
    : patient.phone
      ? [
          {
            system: 'phone' as const,
            value: patient.phone,
            use: 'mobile' as const,
          },
        ]
      : [];
  if (telecom.length > 0) payload.telecom = telecom;

  const addresses = currentAddresses.length
    ? currentAddresses.map(toAddress)
    : patient.address
      ? [
          {
            use: 'home' as const,
            type: 'physical' as const,
            text: patient.address,
            country: 'ID',
          },
        ]
      : [];
  if (addresses.length > 0) payload.address = addresses;

  if (patient.deceasedAt) {
    payload.deceasedDateTime = patient.deceasedAt;
  } else {
    payload.deceasedBoolean = false;
  }

  if (patient.maritalStatusCode) {
    payload.maritalStatus = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
          code: patient.maritalStatusCode,
        },
      ],
    };
  }

  if (patient.birthPlaceText || patient.citizenshipCode) {
    payload.extension = [
      ...(patient.birthPlaceText
        ? [
            {
              url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/birthPlace',
              valueAddress: { text: patient.birthPlaceText },
            },
          ]
        : []),
      ...(patient.citizenshipCode
        ? [
            {
              url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/citizenship',
              valueCode: patient.citizenshipCode,
            },
          ]
        : []),
    ];
  }

  return payload;
}

export function toSatusehatPatientPatch(
  patient: Patient,
): SatusehatPatientPatchOperation[] {
  const payload = toSatusehatPatientPayload(patient);
  // SATUSEHAT's MPI Patient update validates the canonical full name. Sending
  // local aliases/usual names in the same replacement can make that validation
  // resolve the name element as empty, even when the official name is present.
  const officialName =
    payload.name.find((name) => name.use === 'official') ?? payload.name[0];
  const operations: SatusehatPatientPatchOperation[] = [
    { op: 'replace', path: '/identifier', value: payload.identifier },
    { op: 'replace', path: '/name', value: officialName ? [officialName] : [] },
    { op: 'replace', path: '/gender', value: payload.gender },
    { op: 'replace', path: '/birthDate', value: payload.birthDate },
    { op: 'replace', path: '/address', value: payload.address ?? [] },
    {
      op: 'replace',
      path: '/extension',
      value: payload.extension ?? [],
    },
  ];

  if (payload.maritalStatus) {
    operations.push({
      op: 'replace',
      path: '/maritalStatus',
      value: payload.maritalStatus,
    });
  }

  return operations;
}

function toIdentifier(
  identifier: PatientIdentifier,
): SatusehatPatientIdentifierPayload {
  return {
    use: 'official',
    system: identifierSystems[identifier.type] ?? identifier.system,
    value: identifier.value,
  };
}

function toName(name: PatientName): SatusehatPatientNamePayload {
  return {
    use: nameUse(name.use),
    text: name.text,
    ...(name.family ? { family: name.family } : {}),
    ...(name.given.length > 0 ? { given: name.given } : {}),
    ...(name.prefix.length > 0 ? { prefix: name.prefix } : {}),
    ...(name.suffix.length > 0 ? { suffix: name.suffix } : {}),
  };
}

function toTelecom(telecom: PatientTelecom): SatusehatPatientTelecomPayload {
  return {
    system: telecomSystem(telecom.system),
    value: telecom.value,
    ...(telecomUse(telecom.use) ? { use: telecomUse(telecom.use) } : {}),
  };
}

function toAddress(address: PatientAddress): SatusehatPatientAddressPayload {
  const extension = toAdministrativeCodeExtension(address);

  return {
    use: addressUse(address.use),
    type: addressType(address.type),
    ...(address.text ? { text: address.text } : {}),
    ...(address.lines.length > 0 ? { line: address.lines } : {}),
    ...(address.regencyName ? { city: address.regencyName } : {}),
    ...(address.districtName ? { district: address.districtName } : {}),
    ...(address.provinceName ? { state: address.provinceName } : {}),
    ...(address.postalCode ? { postalCode: address.postalCode } : {}),
    ...(address.countryCode ? { country: address.countryCode } : {}),
    ...(extension ? { extension } : {}),
  };
}

function toAdministrativeCodeExtension(
  address: PatientAddress,
): SatusehatPatientAddressPayload['extension'] {
  type AdministrativeCodeName =
    'province' | 'city' | 'district' | 'village' | 'rt' | 'rw';

  const source: Array<{
    url: AdministrativeCodeName;
    valueCode?: string;
  }> = [
    { url: 'province', valueCode: address.provinceCode },
    { url: 'city', valueCode: address.regencyCode },
    { url: 'district', valueCode: address.districtCode },
    { url: 'village', valueCode: address.villageCode },
  ];
  const entries = source.flatMap(({ url, valueCode }) =>
    valueCode ? [{ url, valueCode }] : [],
  );

  return entries.length > 0
    ? [{ url: PATIENT_ADMINISTRATIVE_CODE_URL, extension: entries }]
    : undefined;
}

function nameUse(use: PatientNameUse): SatusehatPatientNamePayload['use'] {
  switch (use) {
    case PatientNameUse.PREFERRED:
      return 'usual';
    case PatientNameUse.ALIAS:
      return 'nickname';
    case PatientNameUse.OLD:
      return 'old';
    default:
      return 'official';
  }
}

function telecomSystem(
  system: TelecomSystem,
): SatusehatPatientTelecomPayload['system'] {
  return system.toLowerCase() as SatusehatPatientTelecomPayload['system'];
}

function telecomUse(use: TelecomUse): SatusehatPatientTelecomPayload['use'] {
  const normalized = use.toLowerCase();
  return normalized === 'home' ||
    normalized === 'work' ||
    normalized === 'temp' ||
    normalized === 'mobile'
    ? normalized
    : undefined;
}

function addressUse(use: AddressUse): SatusehatPatientAddressPayload['use'] {
  const normalized = use.toLowerCase();
  return normalized === 'home' ||
    normalized === 'work' ||
    normalized === 'temp' ||
    normalized === 'old'
    ? normalized
    : undefined;
}

function addressType(
  type: AddressType,
): SatusehatPatientAddressPayload['type'] {
  return type.toLowerCase() as SatusehatPatientAddressPayload['type'];
}
