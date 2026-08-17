export const OBSERVATION_RESOURCE_TYPE = 'Observation';
export const LOCAL_OBSERVATION_RESOURCE_TYPE = 'ClinicalObservation';
export const OBSERVATION_PROVIDER = 'SATUSEHAT';
export const DEFAULT_OBSERVATION_ENVIRONMENT = 'sandbox';

export const OBSERVATION_MAPPER_VERSION = 'mitrafaskes-observation-mapper-v1';
export const OBSERVATION_FHIR_PROFILE_VERSION = 'FHIR-R4-Observation-v1';
export const OBSERVATION_PLAYBOOK_VERSION =
  'mitrafaskes-satusehat-rawat-jalan-v1';

export const OBSERVATION_CATEGORY_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/observation-category';
export const OBSERVATION_CATEGORY_CODE = 'vital-signs';
export const OBSERVATION_CATEGORY_DISPLAY = 'Vital Signs';
export const OBSERVATION_LOINC_SYSTEM = 'http://loinc.org';
export const OBSERVATION_UCUM_SYSTEM = 'http://unitsofmeasure.org';

export const OBSERVATION_MAPPINGS = [
  {
    localCodes: ['systolic-blood-pressure'],
    loincCode: '8480-6',
    loincDisplay: 'Systolic blood pressure',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
    acceptedUnits: ['mmHg', 'mm[Hg]'],
  },
  {
    localCodes: ['diastolic-blood-pressure'],
    loincCode: '8462-4',
    loincDisplay: 'Diastolic blood pressure',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
    acceptedUnits: ['mmHg', 'mm[Hg]'],
  },
  {
    localCodes: ['heart-rate'],
    loincCode: '8867-4',
    loincDisplay: 'Heart rate',
    unit: 'per minute',
    ucumCode: '/min',
    acceptedUnits: ['/min', 'per minute', 'bpm'],
  },
  {
    localCodes: ['respiratory-rate'],
    loincCode: '9279-1',
    loincDisplay: 'Respiratory rate',
    unit: 'per minute',
    ucumCode: '/min',
    acceptedUnits: ['/min', 'per minute', 'breaths/min'],
  },
  {
    localCodes: ['body-temperature'],
    loincCode: '8310-5',
    loincDisplay: 'Body temperature',
    unit: 'Cel',
    ucumCode: 'Cel',
    acceptedUnits: ['Cel', '°C', 'C'],
  },
  {
    localCodes: ['oxygen-saturation'],
    loincCode: '2708-6',
    loincDisplay: 'Oxygen saturation in Arterial blood',
    unit: '%',
    ucumCode: '%',
    acceptedUnits: ['%', 'percent'],
  },
  {
    localCodes: ['body-weight'],
    loincCode: '29463-7',
    loincDisplay: 'Body weight',
    unit: 'kg',
    ucumCode: 'kg',
    acceptedUnits: ['kg'],
  },
  {
    localCodes: ['body-height'],
    loincCode: '8302-2',
    loincDisplay: 'Body height',
    unit: 'cm',
    ucumCode: 'cm',
    acceptedUnits: ['cm'],
  },
  {
    localCodes: ['body-mass-index'],
    loincCode: '39156-5',
    loincDisplay: 'Body mass index (BMI) [Ratio]',
    unit: 'kg/m2',
    ucumCode: 'kg/m2',
    acceptedUnits: ['kg/m2', 'kg/m²'],
  },
] as const;

export const LOCAL_OBSERVATION_CODE_SYSTEM =
  'urn:mitrafaskes:clinical-observation';
