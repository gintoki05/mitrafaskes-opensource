export const SATUSEHAT_PROVIDER = 'SATUSEHAT';
export const DEFAULT_SATUSEHAT_ENVIRONMENT = 'sandbox';

export const ENCOUNTER_RESOURCE_TYPE = 'Encounter';
export const LOCAL_ENCOUNTER_RESOURCE_TYPE = 'Encounter';
export const LOCAL_ORGANIZATION_RESOURCE_TYPE = 'HealthcareOrganization';
export const LOCAL_LOCATION_RESOURCE_TYPE = 'Location';
export const LOCAL_PATIENT_RESOURCE_TYPE = 'Patient';
export const LOCAL_PRACTITIONER_RESOURCE_TYPE = 'User';

// These are project-owned adapter versions recorded with every sync attempt.
// They explain historical payloads without claiming an unversioned upstream
// SATUSEHAT documentation page as a stable release.
export const ENCOUNTER_MAPPER_VERSION = 'mitrafaskes-encounter-mapper-v1';
export const ENCOUNTER_FHIR_PROFILE_VERSION = 'FHIR-R4-Encounter-v1';
export const ENCOUNTER_PLAYBOOK_VERSION =
  'mitrafaskes-satusehat-rawat-jalan-v1';

export const ENCOUNTER_IDENTIFIER_SYSTEM_PREFIX =
  'http://sys-ids.kemkes.go.id/encounter/';
export const ACT_CODE_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/v3-ActCode';
export const PARTICIPATION_TYPE_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/v3-ParticipationType';

export const AMBULATORY_CLASS = {
  system: ACT_CODE_SYSTEM,
  code: 'AMB',
  display: 'ambulatory',
} as const;

export const ATTENDER_PARTICIPATION = {
  system: PARTICIPATION_TYPE_SYSTEM,
  code: 'ATND',
  display: 'attender',
} as const;
