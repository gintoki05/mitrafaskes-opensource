export enum SyncStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface SatusehatSyncLog {
  id: string;
  resourceType: 'Encounter' | 'Condition' | 'Observation' | 'MedicationRequest';
  resourceId: string;
  status: SyncStatus;
  payload: any;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
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
