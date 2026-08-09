import type {
  LocationSummary,
  OrganizationSummary,
  PractitionerSummary,
} from './master-data';

export enum SyncStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export type SatusehatAuthConnectionState =
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'ERROR';

export interface SatusehatAuthStatus {
  environment: string;
  oauthBaseUrl: string;
  credentialsConfigured: boolean;
  organizationConfigured: boolean;
  status: SatusehatAuthConnectionState;
  token: {
    available: boolean;
    expiresAt?: string;
  };
  error?: {
    code: string;
    message: string;
    httpStatus?: number;
  };
}

export interface SatusehatOrganizationSearchQuery {
  id?: string;
  name?: string;
  partOf?: string;
  parentLocalId?: string;
}

export interface SatusehatOrganizationIdentifier {
  system: string;
  value: string;
}

export interface SatusehatOrganizationRemoteSummary {
  externalResourceId: string;
  name: string;
  active: boolean;
  typeCode?: string;
  typeDisplay?: string;
  parentExternalResourceId?: string;
  parentDisplay?: string;
  identifiers: SatusehatOrganizationIdentifier[];
  addressText?: string;
  phone?: string;
  email?: string;
  linkedLocalResourceId?: string;
}

export interface SatusehatOrganizationSearchResponse {
  items: SatusehatOrganizationRemoteSummary[];
  total: number;
}

export interface SatusehatOrganizationLinkRequest {
  externalResourceId: string;
}

export interface SatusehatOrganizationImportRequest {
  externalResourceId: string;
  code: string;
  parentId?: string;
}

export interface SatusehatOrganizationMutationResponse {
  operation: 'LINK_EXISTING' | 'IMPORT';
  localResourceId: string;
  externalResourceId: string;
  organization: OrganizationSummary;
}

export interface SatusehatSyncLog {
  id: string;
  resourceType:
    | 'Organization'
    | 'Location'
    | 'Practitioner'
    | 'Patient'
    | 'Encounter'
    | 'Condition'
    | 'Observation'
    | 'MedicationRequest';
  resourceId: string;
  status: SyncStatus;
  payload: any;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
}

export interface SatusehatPatientIdentifier {
  system: string;
  value: string;
}

export type SatusehatPatientGender = 'male' | 'female';

export interface SatusehatPatientRemoteSummary {
  externalResourceId: string;
  name: string;
  active: boolean;
  gender?: SatusehatPatientGender;
  birthDate?: string;
  identifiers: SatusehatPatientIdentifier[];
  linkedLocalResourceId?: string;
}

export interface SatusehatPatientSearchResponse {
  items: SatusehatPatientRemoteSummary[];
  total: number;
}

export type SatusehatPatientLookupIdentifier = 'NIK' | 'IHS';

export interface SatusehatPatientLookupQuery {
  identifierType: SatusehatPatientLookupIdentifier;
  identifier: string;
}

export interface SatusehatPatientLinkRequest {
  externalResourceId: string;
}

export interface SatusehatPatientIdentifierPayload {
  use: 'official';
  system: string;
  value: string;
}

export interface SatusehatPatientNamePayload {
  use: 'official' | 'usual' | 'nickname' | 'old';
  text: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface SatusehatPatientTelecomPayload {
  system: 'phone' | 'email' | 'fax' | 'other';
  value: string;
  use?: 'home' | 'work' | 'temp' | 'mobile' | 'old';
}

export interface SatusehatPatientAddressPayload {
  use?: 'home' | 'work' | 'temp' | 'old';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  extension?: SatusehatPatientAdministrativeCodeExtension[];
}

export interface SatusehatPatientAdministrativeCodeExtension {
  url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode';
  extension: {
    url: 'province' | 'city' | 'district' | 'village' | 'rt' | 'rw';
    valueCode: string;
  }[];
}

export interface SatusehatPatientPayload {
  resourceType: 'Patient';
  id?: string;
  identifier: SatusehatPatientIdentifierPayload[];
  active: boolean;
  name: SatusehatPatientNamePayload[];
  telecom?: SatusehatPatientTelecomPayload[];
  gender: SatusehatPatientGender;
  birthDate: string;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  maritalStatus?: {
    coding: { system?: string; code: string }[];
  };
  address?: SatusehatPatientAddressPayload[];
  extension?: {
    url: string;
    valueAddress?: { text?: string };
    valueCode?: string;
  }[];
}

export interface SatusehatPatientPatchOperation {
  op: 'replace';
  path: string;
  value: unknown;
}

export type SatusehatPatientPreviewPayload =
  | SatusehatPatientPayload
  | SatusehatPatientPatchOperation[];

export type SatusehatPatientOperation = 'CREATE' | 'UPDATE';

export interface SatusehatPatientPreview {
  localResourceId: string;
  operation: SatusehatPatientOperation;
  externalResourceId?: string;
  payload: SatusehatPatientPreviewPayload;
}

export interface SatusehatPatientSyncResult extends SatusehatPatientPreview {
  syncedRemotely: boolean;
  syncLogId?: string;
  response?: unknown;
}

export interface SatusehatPatientMutationResponse {
  operation: 'LINK_EXISTING';
  localResourceId: string;
  externalResourceId: string;
  patient: import('./patient').Patient;
  remote: SatusehatPatientRemoteSummary;
}

export interface SatusehatPractitionerIdentifier {
  system: string;
  value: string;
}

export type SatusehatPractitionerGender = 'male' | 'female' | 'other' | 'unknown';

export interface SatusehatPractitionerRemoteSummary {
  externalResourceId: string;
  name: string;
  active: boolean;
  gender?: SatusehatPractitionerGender;
  birthDate?: string;
  identifiers: SatusehatPractitionerIdentifier[];
  linkedLocalResourceId?: string;
}

export interface SatusehatPractitionerSearchResponse {
  items: SatusehatPractitionerRemoteSummary[];
  total: number;
}

export type SatusehatPractitionerLookupIdentifier = 'NIK' | 'IHS';

export interface SatusehatPractitionerLookupQuery {
  identifierType: SatusehatPractitionerLookupIdentifier;
  identifier: string;
}

export interface SatusehatPractitionerLinkRequest {
  externalResourceId: string;
}

export interface SatusehatPractitionerMutationResponse {
  operation: 'LINK_EXISTING';
  localResourceId: string;
  externalResourceId: string;
  practitioner: PractitionerSummary;
  remote: SatusehatPractitionerRemoteSummary;
}

export interface SatusehatOrganizationPayload {
  resourceType: 'Organization';
  id?: string;
  identifier: {
    use: 'official';
    system: string;
    value: string;
  }[];
  active: boolean;
  type: {
    coding: {
      system: 'http://terminology.hl7.org/CodeSystem/organization-type';
      code: 'prov' | 'dept';
      display: string;
    }[];
  }[];
  name: string;
  telecom?: {
    system: 'phone' | 'email';
    value: string;
    use: 'work';
  }[];
  address?: {
    use: 'work';
    type: 'both';
    text: string;
    line: string[];
    country: string;
  }[];
  partOf?: {
    reference: string;
    display?: string;
  };
}

export interface SatusehatLocationPayload {
  resourceType: 'Location';
  id?: string;
  identifier: {
    use: 'official';
    system: string;
    value: string;
  }[];
  status: 'active' | 'suspended' | 'inactive';
  name: string;
  description?: string;
  mode: 'instance' | 'kind';
  physicalType?: {
    coding: {
      system: 'http://terminology.hl7.org/CodeSystem/location-physical-type';
      code: string;
      display: string;
    }[];
  };
  address?: {
    use: 'work';
    line?: string[];
    city?: string;
    postalCode?: string;
    country?: string;
  };
  position?: {
    longitude: number;
    latitude: number;
    altitude?: number;
  };
  managingOrganization: {
    reference: string;
    display?: string;
  };
  partOf?: {
    reference: string;
    display?: string;
  };
}

export type SatusehatLocationOperation = 'CREATE' | 'UPDATE';

export interface SatusehatLocationPreview {
  localResourceId: string;
  operation: SatusehatLocationOperation;
  externalResourceId?: string;
  payload: SatusehatLocationPayload;
}

export interface SatusehatLocationSyncResult extends SatusehatLocationPreview {
  syncedRemotely: boolean;
  syncLogId?: string;
  response?: unknown;
}

export interface SatusehatLocationSearchQuery {
  id?: string;
  identifier?: string;
  name?: string;
  organization?: string;
  organizationLocalId?: string;
}

export interface SatusehatLocationRemoteSummary {
  externalResourceId: string;
  identifierSystem?: string;
  identifierValue?: string;
  name: string;
  description?: string;
  status: 'active' | 'suspended' | 'inactive';
  mode: 'instance' | 'kind';
  physicalTypeCode?: string;
  physicalTypeDisplay?: string;
  managingOrganizationExternalResourceId?: string;
  managingOrganizationDisplay?: string;
  parentExternalResourceId?: string;
  parentDisplay?: string;
  addressText?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  linkedLocalResourceId?: string;
  parentLinkedLocalResourceId?: string;
}

export interface SatusehatLocationSearchResponse {
  items: SatusehatLocationRemoteSummary[];
  total: number;
}

export interface SatusehatLocationLinkRequest {
  externalResourceId: string;
}

export interface SatusehatLocationImportRequest {
  externalResourceId: string;
  organizationId?: string;
  parentId?: string;
  code?: string;
}

export interface SatusehatLocationMutationResponse {
  operation: 'LINK_EXISTING' | 'IMPORT';
  localResourceId: string;
  externalResourceId: string;
  location: LocationSummary;
}

export interface SatusehatLocationContext {
  location: LocationSummary;
  organizationExternalId: string;
  organizationDisplay: string;
  parentExternalId?: string;
  parentDisplay?: string;
  externalResourceId?: string;
}

export interface SatusehatEncounterPayload {
  resourceType: 'Encounter';
  status: 'arrived' | 'in-progress' | 'finished';
  class: {
    system: string;
    code: string;
    display: string;
  };
  subject: {
    reference: string; // Patient/SATUSEHAT_ID
    display: string;
  };
  participant: {
    individual: {
      reference: string; // Practitioner/SIP_ID
      display: string;
    };
  }[];
  period: {
    start: string;
    end?: string;
  };
  location?: {
    location: {
      reference: string;
      display: string;
    };
  }[];
}

export interface SatusehatConditionPayload {
  resourceType: 'Condition';
  clinicalStatus: {
    coding: {
      system: string;
      code: string;
    }[];
  };
  category: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  code: {
    coding: {
      system: string; // http://hl7.org/fhir/sid/icd-10
      code: string;
      display: string;
    }[];
  };
  subject: {
    reference: string;
    display: string;
  };
  encounter: {
    reference: string;
  };
}
