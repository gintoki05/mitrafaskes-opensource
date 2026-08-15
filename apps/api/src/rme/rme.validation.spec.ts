import {
  ClinicalHistoryCategory,
  ClinicalHistoryStatus,
} from '@mitrafaskes/shared';
import {
  parseCompleteTriageInput,
  parseDraftInput,
  parseTriageDraftInput,
} from './rme.validation';

describe('RME clinical history validation', () => {
  it('parses categorized history entries and their optional onset', () => {
    const draft = parseDraftInput({
      encounterId: 'encounter-1',
      expectedVersion: 2,
      histories: [
        {
          id: 'history-1',
          category: ClinicalHistoryCategory.PAST_MEDICAL,
          text: 'Asma sejak kecil',
          status: ClinicalHistoryStatus.ACTIVE,
          onset: '2010-04-23',
          note: 'Menggunakan inhaler bila kambuh',
        },
      ],
      diagnoses: [],
      prescriptions: [],
    });

    expect(draft.histories).toEqual([
      expect.objectContaining({
        id: 'history-1',
        category: ClinicalHistoryCategory.PAST_MEDICAL,
        text: 'Asma sejak kecil',
        status: ClinicalHistoryStatus.ACTIVE,
        onsetAt: new Date('2010-04-23'),
        note: 'Menggunakan inhaler bila kambuh',
      }),
    ]);
  });

  it('rejects an incomplete history entry instead of persisting an ambiguous row', () => {
    expect(() =>
      parseDraftInput({
        encounterId: 'encounter-1',
        expectedVersion: 0,
        histories: [
          {
            category: ClinicalHistoryCategory.FAMILY,
            text: '',
          },
        ],
        diagnoses: [],
        prescriptions: [],
      }),
    ).toThrow('histories[0].text wajib diisi');
  });

  it('parses a triage draft without accepting doctor-only fields', () => {
    const draft = parseTriageDraftInput({
      encounterId: 'encounter-1',
      expectedVersion: 0,
      chiefComplaint: 'Demam',
      allergyReviewStatus: 'NONE_KNOWN',
      systolic: '120',
      diastolic: 80,
      heartRate: 78,
      temperature: 37.2,
      physicalExam: 'field ignored by triage contract',
      histories: [],
    });

    expect(draft).toEqual(
      expect.objectContaining({
        encounterId: 'encounter-1',
        expectedVersion: 0,
        chiefComplaint: 'Demam',
        systolic: 120,
        temperature: 37.2,
      }),
    );
    expect('physicalExam' in draft).toBe(false);
  });

  it('requires a safe idempotency key for triage completion', () => {
    expect(() =>
      parseCompleteTriageInput({
        encounterId: 'encounter-1',
        expectedVersion: 1,
        idempotencyKey: 'short',
      }),
    ).toThrow('idempotencyKey harus sepanjang 8-128 karakter aman');
  });
});
