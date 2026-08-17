import {
  assertSatusehatConditionPayload,
  type SatusehatConditionPayload,
  type SatusehatConditionReference,
} from './satusehat-condition.contract';
import {
  CONDITION_CATEGORY_CODE,
  CONDITION_CATEGORY_DISPLAY,
  CONDITION_CATEGORY_SYSTEM,
  CONDITION_CODE_SYSTEM,
  CONDITION_CLINICAL_STATUS_SYSTEM,
  CONDITION_VERIFICATION_STATUS_SYSTEM,
  SATUSEHAT_CONDITION_STATUS,
} from './satusehat-condition.constants';

export interface DiagnosisConditionSource {
  id: string;
  icd10Code: string;
  isPrimary: boolean;
  icd10?: {
    code: string;
    display: string;
    active: boolean;
  } | null;
  medicalRecord: {
    authoredAt: Date | null;
    finalizedAt: Date | null;
    encounter: {
      id: string;
      arrivedAt: Date;
      patient: { id: string; fullName: string };
      doctor: { id: string; fullName: string };
      encounterNumber: string;
    };
  };
}

export interface SatusehatConditionDependencies {
  patientExternalId: string;
  encounterExternalId: string;
  practitionerExternalId: string;
  diagnosisExternalId?: string;
}

const reference = (
  resourceType: string,
  id: string,
  display?: string,
): SatusehatConditionReference => ({
  reference: `${resourceType}/${id}`,
  ...(display ? { display } : {}),
});

export function toSatusehatConditionPayload(
  diagnosis: DiagnosisConditionSource,
  dependencies: SatusehatConditionDependencies,
): SatusehatConditionPayload {
  const code = diagnosis.icd10?.code.trim() || diagnosis.icd10Code.trim();
  const display = diagnosis.icd10?.display.trim() || code;
  const recordedAt =
    diagnosis.medicalRecord.finalizedAt ??
    diagnosis.medicalRecord.authoredAt ??
    diagnosis.medicalRecord.encounter.arrivedAt;

  const payload: SatusehatConditionPayload = {
    resourceType: 'Condition',
    ...(dependencies.diagnosisExternalId
      ? { id: dependencies.diagnosisExternalId }
      : {}),
    clinicalStatus: {
      coding: [
        {
          system: CONDITION_CLINICAL_STATUS_SYSTEM,
          code: SATUSEHAT_CONDITION_STATUS.clinical.code,
          display: SATUSEHAT_CONDITION_STATUS.clinical.display,
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: CONDITION_VERIFICATION_STATUS_SYSTEM,
          code: SATUSEHAT_CONDITION_STATUS.verification.code,
          display: SATUSEHAT_CONDITION_STATUS.verification.display,
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: CONDITION_CATEGORY_SYSTEM,
            code: CONDITION_CATEGORY_CODE,
            display: CONDITION_CATEGORY_DISPLAY,
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: CONDITION_CODE_SYSTEM,
          code,
          display,
        },
      ],
    },
    subject: reference(
      'Patient',
      dependencies.patientExternalId,
      diagnosis.medicalRecord.encounter.patient.fullName,
    ),
    encounter: reference(
      'Encounter',
      dependencies.encounterExternalId,
      diagnosis.medicalRecord.encounter.encounterNumber,
    ),
    onsetDateTime: diagnosis.medicalRecord.encounter.arrivedAt.toISOString(),
    recordedDate: recordedAt.toISOString(),
    recorder: reference(
      'Practitioner',
      dependencies.practitionerExternalId,
      diagnosis.medicalRecord.encounter.doctor.fullName,
    ),
    asserter: reference(
      'Practitioner',
      dependencies.practitionerExternalId,
      diagnosis.medicalRecord.encounter.doctor.fullName,
    ),
  };

  assertSatusehatConditionPayload(payload);
  return payload;
}
