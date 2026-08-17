import {
  AddressType,
  AddressUse,
  Gender,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
} from '@mitrafaskes/shared';

export interface PatientValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidatedPatientIdentifierInput {
  type: PatientIdentifierType;
  system: string;
  value: string;
  normalizedValue: string;
  verificationStatus: VerificationStatus;
  isPrimary: boolean;
  active: boolean;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedPatientNameInput {
  use: PatientNameUse;
  text: string;
  given: string[];
  family?: string;
  prefix: string[];
  suffix: string[];
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedPatientTelecomInput {
  system: TelecomSystem;
  value: string;
  normalizedValue: string;
  use: TelecomUse;
  rank: number;
  verificationStatus: VerificationStatus;
  active: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedPatientAddressInput {
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
  validFrom?: Date;
  validTo?: Date;
}

export interface ValidatedRelatedPersonInput {
  fullName: string;
  gender?: Gender;
  birthDate?: Date;
  phone?: string;
  email?: string;
  addressText?: string;
}

export interface ValidatedPatientRelationshipInput {
  relationshipCode: PatientRelationshipCode;
  relatedPatientId?: string;
  relatedPersonId?: string;
  relatedPerson?: ValidatedRelatedPersonInput;
  startAt?: Date;
  endAt?: Date;
  isGuardian: boolean;
  contactPriority?: number;
  active: boolean;
}

export interface ValidatedPatientInput {
  nik?: string;
  fullName: string;
  birthDate: Date;
  gender: Gender;
  address?: string;
  phone?: string;
  active: boolean;
  birthPlaceText?: string;
  multipleBirthOrder?: number;
  deceasedAt?: Date;
  maritalStatusCode?: string;
  citizenshipCode?: string;
  identifiers: ValidatedPatientIdentifierInput[];
  names: ValidatedPatientNameInput[];
  telecoms: ValidatedPatientTelecomInput[];
  addresses: ValidatedPatientAddressInput[];
  relationships: ValidatedPatientRelationshipInput[];
}

export class PatientValidationError extends Error {
  constructor(readonly issues: PatientValidationIssue[]) {
    super('Data pasien tidak valid');
    this.name = 'PatientValidationError';
  }
}
