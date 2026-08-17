import {
  AllergyReviewStatus,
  EncounterStatus,
  OutpatientDisposition,
} from '@mitrafaskes/shared';
import {
  validateFinalization,
  type FinalizationValidationInput,
} from './rme.finalization-profile';

function completeRecord(): FinalizationValidationInput {
  return {
    serviceProfile: 'OUTPATIENT_GENERAL',
    validationProfile: 'OUTPATIENT_GENERAL_V1',
    chiefComplaint: 'Demam',
    presentIllness: 'Demam sejak dua hari',
    allergyReviewStatus: AllergyReviewStatus.NONE_KNOWN,
    allergyDetails: null,
    physicalExam: 'Keadaan umum baik',
    education: 'Cukup minum dan istirahat',
    carePlan: 'Terapi simptomatik, kontrol bila memburuk',
    disposition: OutpatientDisposition.HOME,
    systolic: 120,
    diastolic: 80,
    heartRate: 78,
    temperature: 37.2,
    diagnoses: [{ icd10Code: 'J00', isPrimary: true }],
    prescriptions: [],
    encounter: {
      status: EncounterStatus.IN_PROGRESS,
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      organizationId: 'organization-1',
      locationId: 'location-1',
      doctor: {
        active: true,
        role: 'DOKTER',
        organizationId: 'organization-1',
        locationId: null,
        locationAssignments: [{ locationId: 'location-1' }],
      },
    },
  };
}

describe('OUTPATIENT_GENERAL_V1 finalization profile', () => {
  it('returns actionable issues grouped by section', () => {
    const result = validateFinalization({
      ...completeRecord(),
      chiefComplaint: null,
      presentIllness: null,
      allergyReviewStatus: AllergyReviewStatus.NOT_REVIEWED,
      systolic: null,
      physicalExam: null,
      diagnoses: [],
      education: null,
      carePlan: null,
      disposition: null,
    });

    expect(result.ready).toBe(false);
    expect(new Set(result.issues.map((entry) => entry.section))).toEqual(
      new Set([
        'anamnesis',
        'allergies',
        'vitalSigns',
        'physicalExam',
        'diagnoses',
        'plan',
      ]),
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ALLERGY_REVIEW_REQUIRED',
          field: 'allergyReviewStatus',
          section: 'allergies',
        }),
        expect.objectContaining({
          code: 'PRIMARY_DIAGNOSIS_REQUIRED',
          section: 'diagnoses',
        }),
      ]),
    );
  });

  it('rejects a service and validation profile mismatch without running another profile', () => {
    const result = validateFinalization({
      ...completeRecord(),
      serviceProfile: 'OUTPATIENT_DENTAL',
    });

    expect(result).toMatchObject({
      ready: false,
      issues: [
        {
          code: 'RME_PROFILE_MISMATCH',
          section: 'profile',
          field: 'serviceProfile',
        },
      ],
    });
  });

  it('accepts a complete local general outpatient record', () => {
    expect(validateFinalization(completeRecord())).toEqual({
      ready: true,
      serviceProfile: 'OUTPATIENT_GENERAL',
      validationProfile: 'OUTPATIENT_GENERAL_V1',
      issues: [],
    });
  });

  it('requires allergy details when the review finds a known allergy', () => {
    const result = validateFinalization({
      ...completeRecord(),
      allergyReviewStatus: AllergyReviewStatus.KNOWN,
      allergyDetails: null,
    });

    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'ALLERGY_DETAILS_REQUIRED',
        field: 'allergyDetails',
        section: 'allergies',
      }),
    ]);
  });
});
