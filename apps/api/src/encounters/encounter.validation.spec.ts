import { EncounterStatus } from '@mitrafaskes/shared';
import { EncounterValidationError } from './encounter.errors';
import {
  parseEncounterStatus,
  parseTriageStatuses,
  parsePositiveInteger,
  validateCreateEncounter,
  validateEncounterHistoryDateRange,
  validateStatusUpdate,
} from './encounter.validation';

describe('Encounter validation', () => {
  it('validates the local-first create contract', () => {
    expect(
      validateCreateEncounter({
        patientId: ' patient-1 ',
        locationId: 'location-1',
        doctorId: 'doctor-1',
      }),
    ).toEqual({
      patientId: 'patient-1',
      locationId: 'location-1',
      doctorId: 'doctor-1',
    });
  });

  it('requires patient, location, and doctor identifiers', () => {
    expect(() => validateCreateEncounter({ patientId: 'patient-1' })).toThrow(
      EncounterValidationError,
    );
    try {
      validateCreateEncounter({ patientId: 'patient-1' });
    } catch (error) {
      expect(error).toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ field: 'locationId' }),
          expect.objectContaining({ field: 'doctorId' }),
        ]),
      });
    }
  });

  it('validates optimistic concurrency input', () => {
    expect(
      validateStatusUpdate({
        status: EncounterStatus.IN_PROGRESS,
        expectedVersion: 2,
      }),
    ).toEqual({ status: EncounterStatus.IN_PROGRESS, expectedVersion: 2 });
    expect(() =>
      validateStatusUpdate({ status: 'not-a-status', expectedVersion: 0 }),
    ).toThrow(EncounterValidationError);
  });

  it('validates query status and clamps page values', () => {
    expect(parseEncounterStatus('cancelled')).toBe(EncounterStatus.CANCELLED);
    expect(() => parseEncounterStatus('CANCELLED')).toThrow(
      EncounterValidationError,
    );
    expect(parsePositiveInteger('3', 1)).toBe(3);
    expect(parsePositiveInteger('999', 1, 100)).toBe(100);
    expect(parsePositiveInteger('nope', 1)).toBe(1);
  });

  it('validates triage status filters for the nurse recovery queue', () => {
    expect(parseTriageStatuses('NOT_STARTED,DRAFT,DRAFT')).toEqual([
      'NOT_STARTED',
      'DRAFT',
    ]);
    expect(() => parseTriageStatuses('COMPLETED,UNKNOWN')).toThrow(
      EncounterValidationError,
    );
  });

  it('requires and trims a reason when correcting an Encounter', () => {
    expect(
      validateStatusUpdate({
        status: EncounterStatus.ENTERED_IN_ERROR,
        expectedVersion: 3,
        reason: '  Duplikasi pendaftaran  ',
      }),
    ).toEqual({
      status: EncounterStatus.ENTERED_IN_ERROR,
      expectedVersion: 3,
      reason: 'Duplikasi pendaftaran',
    });
    expect(() =>
      validateStatusUpdate({
        status: EncounterStatus.ENTERED_IN_ERROR,
        expectedVersion: 3,
      }),
    ).toThrow(EncounterValidationError);
  });

  it('validates an inclusive history date range', () => {
    expect(
      validateEncounterHistoryDateRange('2026-08-01', '2026-08-13'),
    ).toEqual({
      fromDate: new Date('2026-08-01T00:00:00.000Z'),
      toDate: new Date('2026-08-13T00:00:00.000Z'),
    });
  });

  it.each([
    [undefined, '2026-08-13'],
    ['2026-08-01', undefined],
    ['2026-08-13', '2026-08-01'],
    ['2026-02-30', '2026-08-13'],
  ] as const)('rejects invalid history range %j - %j', (fromDate, toDate) => {
    expect(() => validateEncounterHistoryDateRange(fromDate, toDate)).toThrow(
      EncounterValidationError,
    );
  });
});
