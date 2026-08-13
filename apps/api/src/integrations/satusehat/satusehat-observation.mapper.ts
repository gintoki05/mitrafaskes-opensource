import {
  assertSatusehatObservationPayload,
  type SatusehatObservationPayload,
  type SatusehatObservationReference,
} from './satusehat-observation.contract';
import {
  OBSERVATION_CATEGORY_CODE,
  OBSERVATION_CATEGORY_DISPLAY,
  OBSERVATION_CATEGORY_SYSTEM,
  OBSERVATION_LOINC_SYSTEM,
  OBSERVATION_UCUM_SYSTEM,
} from './satusehat-observation.constants';
import type { ClinicalObservationStatus, ClinicalObservationValueType } from '@mitrafaskes/shared';

export interface ClinicalObservationSource {
  id: string;
  category: string;
  codeSystem: string | null;
  code: string;
  codeDisplay: string | null;
  valueType: string;
  valueQuantityValue: number | null;
  valueQuantityUnit: string | null;
  valueQuantitySystem: string | null;
  valueQuantityCode: string | null;
  valueCodeSystem: string | null;
  valueCode: string | null;
  valueCodeDisplay: string | null;
  valueBoolean: boolean | null;
  valueString: string | null;
  effectiveAt: Date;
  performerId: string | null;
  status: string;
  provenance: string;
  derivedFromObservationIds: string[];
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  interpretationCode: string | null;
  interpretationDisplay: string | null;
  medicalRecord: {
    encounter: {
      id: string;
      encounterNumber: string;
      patient: { id: string; fullName: string };
    };
  };
  performer: { id: string; fullName: string } | null;
}

export interface SatusehatObservationMapping {
  loincCode: string;
  loincDisplay: string;
  unit: string;
  ucumCode: string;
}

export interface SatusehatObservationDependencies {
  patientExternalId: string;
  encounterExternalId: string;
  practitionerExternalId: string;
  derivedFromExternalIds?: string[];
  observationExternalId?: string;
}

const reference = (
  resourceType: string,
  id: string,
  display?: string,
): SatusehatObservationReference => ({
  reference: `${resourceType}/${id}`,
  ...(display ? { display } : {}),
});

export function toSatusehatObservationPayload(
  observation: ClinicalObservationSource,
  dependencies: SatusehatObservationDependencies,
  mapping: SatusehatObservationMapping,
): SatusehatObservationPayload {
  const payload: SatusehatObservationPayload = {
    resourceType: 'Observation',
    ...(dependencies.observationExternalId
      ? { id: dependencies.observationExternalId }
      : {}),
    status: observation.status as ClinicalObservationStatus,
    category: [
      {
        coding: [
          {
            system: OBSERVATION_CATEGORY_SYSTEM,
            code: OBSERVATION_CATEGORY_CODE,
            display: OBSERVATION_CATEGORY_DISPLAY,
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: OBSERVATION_LOINC_SYSTEM,
          code: mapping.loincCode,
          display: mapping.loincDisplay,
        },
      ],
    },
    subject: reference(
      'Patient',
      dependencies.patientExternalId,
      observation.medicalRecord.encounter.patient.fullName,
    ),
    encounter: reference(
      'Encounter',
      dependencies.encounterExternalId,
      observation.medicalRecord.encounter.encounterNumber,
    ),
    effectiveDateTime: observation.effectiveAt.toISOString(),
    performer: [
      reference(
        'Practitioner',
        dependencies.practitionerExternalId,
        observation.performer?.fullName,
      ),
    ],
    ...valuePayload(observation, mapping),
    ...(dependencies.derivedFromExternalIds &&
    dependencies.derivedFromExternalIds.length > 0
      ? {
          derivedFrom: dependencies.derivedFromExternalIds.map((id) =>
            reference('Observation', id),
          ),
        }
      : {}),
    ...(observation.referenceRangeLow !== null ||
    observation.referenceRangeHigh !== null
      ? {
          referenceRange: [
            {
              ...(observation.referenceRangeLow === null
                ? {}
                : {
                    low: {
                      value: observation.referenceRangeLow,
                      unit: mapping.unit,
                      system: OBSERVATION_UCUM_SYSTEM,
                      code: mapping.ucumCode,
                    },
                  }),
              ...(observation.referenceRangeHigh === null
                ? {}
                : {
                    high: {
                      value: observation.referenceRangeHigh,
                      unit: mapping.unit,
                      system: OBSERVATION_UCUM_SYSTEM,
                      code: mapping.ucumCode,
                    },
                  }),
            },
          ],
        }
      : {}),
    ...(observation.interpretationCode
      ? {
          interpretation: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: observation.interpretationCode,
                  display:
                    observation.interpretationDisplay ??
                    observation.interpretationCode,
                },
              ],
            },
          ],
        }
      : {}),
  };

  assertSatusehatObservationPayload(payload);
  return payload;
}

function valuePayload(
  observation: ClinicalObservationSource,
  mapping: SatusehatObservationMapping,
): Pick<
  SatusehatObservationPayload,
  'valueQuantity' | 'valueCodeableConcept' | 'valueBoolean' | 'valueString'
> {
  const valueType = observation.valueType as ClinicalObservationValueType;
  if (valueType === 'quantity') {
    return {
      valueQuantity: {
        // Keep the clinician-entered number exactly as stored. Range handling
        // is informational and never clamps or rewrites the value.
        value: observation.valueQuantityValue ?? 0,
        unit: mapping.unit,
        system: OBSERVATION_UCUM_SYSTEM,
        code: mapping.ucumCode,
      },
    };
  }
  if (valueType === 'code') {
    return {
      valueCodeableConcept: {
        coding: [
          {
            system: observation.valueCodeSystem ?? 'urn:mitrafaskes:local-code',
            code: observation.valueCode ?? '',
            display: observation.valueCodeDisplay ?? observation.valueCode ?? '',
          },
        ],
      },
    };
  }
  if (valueType === 'boolean') {
    return { valueBoolean: observation.valueBoolean ?? false };
  }
  return { valueString: observation.valueString ?? '' };
}
