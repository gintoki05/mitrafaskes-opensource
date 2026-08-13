export const CONDITION_RESOURCE_TYPE = 'Condition';
export const LOCAL_CONDITION_RESOURCE_TYPE = 'Diagnosis';
export const CONDITION_PROVIDER = 'SATUSEHAT';
export const DEFAULT_CONDITION_ENVIRONMENT = 'sandbox';

export const CONDITION_MAPPER_VERSION = 'mitrafaskes-condition-mapper-v1';
export const CONDITION_FHIR_PROFILE_VERSION = 'FHIR-R4-Condition-v1';
export const CONDITION_PLAYBOOK_VERSION =
  'mitrafaskes-satusehat-rawat-jalan-v1';

export const CONDITION_CATEGORY_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/condition-category';
export const CONDITION_CATEGORY_CODE = 'encounter-diagnosis';
export const CONDITION_CATEGORY_DISPLAY = 'Encounter Diagnosis';

export const CONDITION_CLINICAL_STATUS_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/condition-clinical';
export const CONDITION_VERIFICATION_STATUS_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/condition-ver-status';
export const CONDITION_CODE_SYSTEM = 'http://hl7.org/fhir/sid/icd-10';

export const LOCAL_PATIENT_RESOURCE_TYPE = 'Patient';
export const LOCAL_ENCOUNTER_RESOURCE_TYPE = 'Encounter';
export const LOCAL_PRACTITIONER_RESOURCE_TYPE = 'User';

export const SATUSEHAT_CONDITION_STATUS = {
  clinical: {
    system: CONDITION_CLINICAL_STATUS_SYSTEM,
    code: 'active',
    display: 'Active',
  },
  verification: {
    system: CONDITION_VERIFICATION_STATUS_SYSTEM,
    code: 'confirmed',
    display: 'Confirmed',
  },
} as const;
