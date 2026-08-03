import type { OrganizationSummary } from './master-data';

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
