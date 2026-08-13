import {
  ClinicalHistoryCategory,
  ClinicalHistoryStatus,
} from '@mitrafaskes/shared';
import { parseDraftInput } from './rme.validation';

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
});
