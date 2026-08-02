export enum SyncStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
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
