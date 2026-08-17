import { validateTriageCompletion } from './triage.validation';

function record(overrides: Record<string, unknown> = {}) {
  return {
    chiefComplaint: 'Demam',
    allergyReviewStatus: 'NONE_KNOWN',
    allergyDetails: null,
    systolic: 120,
    diastolic: 80,
    heartRate: 78,
    temperature: 37.2,
    ...overrides,
  } as any;
}

describe('triage completion validation', () => {
  it('accepts the minimum triage contract', () => {
    expect(validateTriageCompletion(record())).toEqual([]);
  });

  it('requires explicit allergy review and details for known allergies', () => {
    const issues = validateTriageCompletion(
      record({ allergyReviewStatus: 'KNOWN', allergyDetails: '' }),
    );

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'TRIAGE_ALLERGY_DETAILS_REQUIRED',
        section: 'allergies',
      }),
    ]);
  });

  it('reports each missing core vital', () => {
    const issues = validateTriageCompletion(
      record({
        chiefComplaint: '',
        allergyReviewStatus: 'NOT_REVIEWED',
        systolic: null,
        diastolic: null,
        heartRate: null,
        temperature: null,
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      'TRIAGE_CHIEF_COMPLAINT_REQUIRED',
      'TRIAGE_ALLERGY_REVIEW_REQUIRED',
      'TRIAGE_SYSTOLIC_REQUIRED',
      'TRIAGE_DIASTOLIC_REQUIRED',
      'TRIAGE_HEARTRATE_REQUIRED',
      'TRIAGE_TEMPERATURE_REQUIRED',
    ]);
  });
});
