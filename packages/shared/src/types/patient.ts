export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export enum PatientIdentifierType {
  NIK = "NIK",
  MOTHER_NIK = "MOTHER_NIK",
  PASSPORT = "PASSPORT",
  FAMILY_CARD = "FAMILY_CARD",
  OTHER = "OTHER",
}

export enum VerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum PatientNameUse {
  OFFICIAL = "OFFICIAL",
  PREFERRED = "PREFERRED",
  ALIAS = "ALIAS",
  OLD = "OLD",
}

export enum TelecomSystem {
  PHONE = "PHONE",
  EMAIL = "EMAIL",
  FAX = "FAX",
  OTHER = "OTHER",
}

export enum TelecomUse {
  MOBILE = "MOBILE",
  HOME = "HOME",
  WORK = "WORK",
  TEMP = "TEMP",
  OTHER = "OTHER",
}

export enum AddressUse {
  HOME = "HOME",
  WORK = "WORK",
  TEMP = "TEMP",
  OLD = "OLD",
  OTHER = "OTHER",
}

export enum AddressType {
  PHYSICAL = "PHYSICAL",
  POSTAL = "POSTAL",
  BOTH = "BOTH",
}

export enum PatientRelationshipCode {
  MOTHER = "MOTHER",
  FATHER = "FATHER",
  CHILD = "CHILD",
  GUARDIAN = "GUARDIAN",
  CAREGIVER = "CAREGIVER",
  OTHER = "OTHER",
}

export interface PatientIdentifier {
  id: string;
  type: PatientIdentifierType;
  system: string;
  value: string;
  normalizedValue: string;
  verificationStatus: VerificationStatus;
  isPrimary: boolean;
  active: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
}

export interface PatientName {
  id: string;
  use: PatientNameUse;
  text: string;
  given: string[];
  family?: string;
  prefix: string[];
  suffix: string[];
  validFrom?: string;
  validTo?: string;
}

export interface PatientTelecom {
  id: string;
  system: TelecomSystem;
  value: string;
  normalizedValue: string;
  use: TelecomUse;
  rank: number;
  verificationStatus: VerificationStatus;
  active: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface PatientAddress {
  id: string;
  use: AddressUse;
  type: AddressType;
  text?: string;
  lines: string[];
  postalCode?: string;
  countryCode?: string;
  provinceCode?: string;
  provinceName?: string;
  regencyCode?: string;
  regencyName?: string;
  districtCode?: string;
  districtName?: string;
  villageCode?: string;
  villageName?: string;
  active: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface PatientRelatedPerson {
  id: string;
  fullName: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  addressText?: string;
}

export interface PatientRelationship {
  id: string;
  relationshipCode: PatientRelationshipCode;
  relatedPatientId?: string;
  relatedPersonId?: string;
  relatedPerson?: PatientRelatedPerson;
  startAt?: string;
  endAt?: string;
  isGuardian: boolean;
  contactPriority?: number;
  active: boolean;
}

export interface Patient {
  id: string;
  nik?: string;
  fullName: string;
  birthDate: string;
  gender: Gender;
  address?: string;
  phone?: string;
  medicalRecNo: string;
  satusehatId?: string;
  active?: boolean;
  birthPlaceText?: string;
  multipleBirthOrder?: number;
  deceasedAt?: string;
  maritalStatusCode?: string;
  citizenshipCode?: string;
  version?: number;
  identifiers?: PatientIdentifier[];
  names?: PatientName[];
  telecoms?: PatientTelecom[];
  addresses?: PatientAddress[];
  relationships?: PatientRelationship[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientIdentifierDto {
  type: PatientIdentifierType;
  system: string;
  value: string;
  verificationStatus?: VerificationStatus;
  isPrimary?: boolean;
  active?: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
}

export interface CreatePatientNameDto {
  use: PatientNameUse;
  text: string;
  given?: string[];
  family?: string;
  prefix?: string[];
  suffix?: string[];
  validFrom?: string;
  validTo?: string;
}

export interface CreatePatientTelecomDto {
  system: TelecomSystem;
  value: string;
  use: TelecomUse;
  rank?: number;
  verificationStatus?: VerificationStatus;
  active?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface CreatePatientAddressDto {
  use: AddressUse;
  type: AddressType;
  text?: string;
  lines?: string[];
  postalCode?: string;
  countryCode?: string;
  provinceCode?: string;
  provinceName?: string;
  regencyCode?: string;
  regencyName?: string;
  districtCode?: string;
  districtName?: string;
  villageCode?: string;
  villageName?: string;
  active?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface CreatePatientRelatedPersonDto {
  fullName: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  addressText?: string;
}

export interface CreatePatientRelationshipDto {
  relationshipCode: PatientRelationshipCode;
  relatedPatientId?: string;
  relatedPersonId?: string;
  relatedPerson?: CreatePatientRelatedPersonDto;
  startAt?: string;
  endAt?: string;
  isGuardian?: boolean;
  contactPriority?: number;
  active?: boolean;
}

export interface CreatePatientDto {
  nik?: string;
  fullName: string;
  birthDate: string;
  gender: Gender;
  address?: string;
  phone?: string;
  active?: boolean;
  birthPlaceText?: string;
  multipleBirthOrder?: number;
  deceasedAt?: string;
  maritalStatusCode?: string;
  citizenshipCode?: string;
  identifiers?: CreatePatientIdentifierDto[];
  names?: CreatePatientNameDto[];
  telecoms?: CreatePatientTelecomDto[];
  addresses?: CreatePatientAddressDto[];
  relationships?: CreatePatientRelationshipDto[];
}
