export const localResourceTypes: Record<string, string> = {
  Organization: 'HealthcareOrganization',
  Location: 'Location',
  Practitioner: 'User',
  Patient: 'Patient',
  Encounter: 'Encounter',
  Condition: 'Diagnosis',
  Observation: 'ClinicalObservation',
};

export const resources = [
  'Organization',
  'Location',
  'Practitioner',
  'Patient',
  'Encounter',
  'Condition',
  'Observation',
];

export const operations = [
  'search',
  'import',
  'preview',
  'sync',
  'link',
  'logs',
  'reconcile',
];
