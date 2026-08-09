import {
  AddressType,
  AddressUse,
  PatientIdentifierType,
  PatientNameUse,
  type CreatePatientDto,
  type Patient,
  TelecomSystem,
  TelecomUse,
} from '@mitrafaskes/shared';
import { patientFormDefaults, type PatientFormValues } from './patient-form-schema';

const PATIENT_IHS_SYSTEM = 'https://fhir.kemkes.go.id/id/ihs-number';

const current = <T extends { active?: boolean; validTo?: string }>(value: T) =>
  value.active !== false && !value.validTo;

export function patientFormValuesFromPatient(patient: Patient): PatientFormValues {
  const identifiers = patient.identifiers ?? [];
  const activeIdentifiers = identifiers.filter(current);
  const identifierValue = (type: string) =>
    activeIdentifiers.find((identifier) => identifier.type === type)?.value ?? '';
  const names = (patient.names ?? []).filter((name) => !name.validTo);
  const phone = (patient.telecoms ?? []).find(
    (telecom) => current(telecom) && telecom.system === 'PHONE',
  );
  const email = (patient.telecoms ?? []).find(
    (telecom) => current(telecom) && telecom.system === 'EMAIL',
  );
  const address = (patient.addresses ?? []).find(
    (entry) => current(entry) && entry.use === 'HOME',
  );
  const relationship = (patient.relationships ?? []).find(
    (entry) => entry.active !== false,
  );
  const relatedPerson = relationship?.relatedPerson;
  const satusehatId =
    patient.satusehat?.externalResourceId ??
    patient.satusehatId ??
    activeIdentifiers.find(
      (identifier) =>
        identifier.type === 'OTHER' && identifier.system === PATIENT_IHS_SYSTEM,
    )?.value ??
    '';

  return {
    ...patientFormDefaults,
    nik: identifierValue('NIK') || patient.nik || '',
    motherNik: identifierValue('MOTHER_NIK'),
    passport: identifierValue('PASSPORT'),
    familyCard: identifierValue('FAMILY_CARD'),
    satusehatId,
    fullName:
      names.find((name) => name.use === 'OFFICIAL')?.text ?? patient.fullName,
    preferredName:
      names.find((name) => name.use === 'PREFERRED')?.text ?? '',
    aliasName: names.find((name) => name.use === 'ALIAS')?.text ?? '',
    birthDate: patient.birthDate,
    gender: patient.gender,
    birthPlaceText: patient.birthPlaceText ?? '',
    maritalStatusCode: patient.maritalStatusCode ?? '',
    citizenshipCode: patient.citizenshipCode ?? '',
    phone: phone?.value ?? patient.phone ?? '',
    email: email?.value ?? '',
    addressText: address?.text ?? patient.address ?? '',
    postalCode: address?.postalCode ?? '',
    provinceCode: address?.provinceCode ?? '',
    provinceName: address?.provinceName ?? '',
    regencyCode: address?.regencyCode ?? '',
    regencyName: address?.regencyName ?? '',
    districtCode: address?.districtCode ?? '',
    districtName: address?.districtName ?? '',
    villageCode: address?.villageCode ?? '',
    villageName: address?.villageName ?? '',
    active: patient.active !== false,
    relationshipTarget: relationship?.relatedPatientId
      ? 'PATIENT'
      : relationship
        ? 'PERSON'
        : '',
    relationshipCode: relationship?.relationshipCode ?? '',
    relatedPatientId: relationship?.relatedPatientId ?? '',
    relatedPersonId: relationship?.relatedPersonId ?? '',
    relatedPersonName: relatedPerson?.fullName ?? '',
    relatedPersonGender: relatedPerson?.gender ?? '',
    relatedPersonBirthDate: relatedPerson?.birthDate ?? '',
    relatedPersonPhone: relatedPerson?.phone ?? '',
    relatedPersonEmail: relatedPerson?.email ?? '',
    relatedPersonAddress: relatedPerson?.addressText ?? '',
  };
}

export function patientFormValuesToPayload(
  values: PatientFormValues,
  existingPatient?: Patient | null,
): CreatePatientDto {
  const identifiers = [
    values.nik
      ? {
          type: PatientIdentifierType.NIK,
          system: 'urn:id:nik',
          value: values.nik,
          isPrimary: true,
        }
      : undefined,
    values.motherNik
      ? {
          type: PatientIdentifierType.MOTHER_NIK,
          system: 'urn:id:nik',
          value: values.motherNik,
          isPrimary: true,
        }
      : undefined,
    values.passport
      ? {
          type: PatientIdentifierType.PASSPORT,
          system: 'urn:id:passport',
          value: values.passport,
        }
      : undefined,
    values.familyCard
      ? {
          type: PatientIdentifierType.FAMILY_CARD,
          system: 'urn:id:kk',
          value: values.familyCard,
        }
      : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  const preservedOtherIdentifiers = (existingPatient?.identifiers ?? [])
    .filter(
      (identifier) =>
        current(identifier) &&
        identifier.type === PatientIdentifierType.OTHER &&
        identifier.system !== PATIENT_IHS_SYSTEM,
    )
    .map((identifier) => ({
      type: identifier.type,
      system: identifier.system,
      value: identifier.value,
      verificationStatus: identifier.verificationStatus,
      isPrimary: identifier.isPrimary,
      active: identifier.active,
      issuer: identifier.issuer,
      validFrom: identifier.validFrom,
      validTo: identifier.validTo,
    }));

  const names = [
    { use: PatientNameUse.OFFICIAL, text: values.fullName },
    values.preferredName
      ? { use: PatientNameUse.PREFERRED, text: values.preferredName }
      : undefined,
    values.aliasName
      ? { use: PatientNameUse.ALIAS, text: values.aliasName }
      : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  const telecoms = [
    values.phone
      ? { system: TelecomSystem.PHONE, use: TelecomUse.MOBILE, value: values.phone }
      : undefined,
    values.email
      ? { system: TelecomSystem.EMAIL, use: TelecomUse.HOME, value: values.email, rank: 2 }
      : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  const hasAddress = Boolean(
    values.addressText ||
      values.postalCode ||
      values.provinceCode ||
      values.provinceName ||
      values.regencyCode ||
      values.regencyName ||
      values.districtCode ||
      values.districtName ||
      values.villageCode ||
      values.villageName,
  );
  const addresses = hasAddress
    ? [
        {
          use: AddressUse.HOME,
          type: AddressType.PHYSICAL,
          text: values.addressText || undefined,
          lines: [],
          postalCode: values.postalCode || undefined,
          countryCode: 'ID',
          provinceCode: values.provinceCode || undefined,
          provinceName: values.provinceName || undefined,
          regencyCode: values.regencyCode || undefined,
          regencyName: values.regencyName || undefined,
          districtCode: values.districtCode || undefined,
          districtName: values.districtName || undefined,
          villageCode: values.villageCode || undefined,
          villageName: values.villageName || undefined,
        },
      ]
    : [];

  const existingRelationships = existingPatient?.relationships ?? [];
  const hasCurrentRelationship =
    values.relationshipTarget !== '' ||
    values.relatedPatientId ||
    values.relatedPersonName;
  const preservedRelationships = existingRelationships
    .slice(hasCurrentRelationship ? 1 : 0)
    .map((relationship) => ({
      relationshipCode: relationship.relationshipCode,
      ...(relationship.relatedPatientId
        ? { relatedPatientId: relationship.relatedPatientId }
        : relationship.relatedPersonId
          ? { relatedPersonId: relationship.relatedPersonId }
          : relationship.relatedPerson
            ? {
                relatedPerson: {
                  fullName: relationship.relatedPerson.fullName,
                  gender: relationship.relatedPerson.gender,
                  birthDate: relationship.relatedPerson.birthDate,
                  phone: relationship.relatedPerson.phone,
                  email: relationship.relatedPerson.email,
                  addressText: relationship.relatedPerson.addressText,
                },
              }
            : {}),
      startAt: relationship.startAt,
      endAt: relationship.endAt,
      isGuardian: relationship.isGuardian,
      contactPriority: relationship.contactPriority,
      active: relationship.active,
    }));

  const currentRelationship =
    values.relationshipCode &&
    (values.relationshipTarget === 'PATIENT' && values.relatedPatientId
      ? {
          relationshipCode: values.relationshipCode,
          relatedPatientId: values.relatedPatientId,
          isGuardian: values.relationshipCode === 'GUARDIAN',
        }
      : values.relationshipTarget === 'PERSON' && values.relatedPersonName
        ? {
            relationshipCode: values.relationshipCode,
            relatedPerson: {
              fullName: values.relatedPersonName,
              gender: values.relatedPersonGender || undefined,
              birthDate: values.relatedPersonBirthDate || undefined,
              phone: values.relatedPersonPhone || undefined,
              email: values.relatedPersonEmail || undefined,
              addressText: values.relatedPersonAddress || undefined,
            },
            isGuardian: values.relationshipCode === 'GUARDIAN',
          }
        : undefined);

  return {
    nik: values.nik || undefined,
    fullName: values.fullName,
    birthDate: values.birthDate,
    gender: values.gender,
    address: values.addressText || undefined,
    phone: values.phone || undefined,
    active: values.active,
    birthPlaceText: values.birthPlaceText || undefined,
    maritalStatusCode: values.maritalStatusCode || undefined,
    citizenshipCode: values.citizenshipCode || undefined,
    satusehatId:
      values.satusehatId ||
      existingPatient?.satusehat?.externalResourceId ||
      existingPatient?.satusehatId ||
      undefined,
    identifiers: [...identifiers, ...preservedOtherIdentifiers],
    names,
    telecoms,
    addresses,
    relationships: currentRelationship
      ? [currentRelationship, ...preservedRelationships]
      : preservedRelationships,
  };
}
