import { EncounterStatus } from '@mitrafaskes/shared';
import { EncounterValidationError } from './encounter.errors';
import {
  parseEncounterStatus,
  parsePositiveInteger,
  validateCreateEncounter,
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
      validateStatusUpdate({ status: 'WAITING', expectedVersion: 0 }),
    ).toThrow(EncounterValidationError);
  });

  it('validates query status and clamps page values', () => {
    expect(parseEncounterStatus('CANCELLED')).toBe(EncounterStatus.CANCELLED);
    expect(() => parseEncounterStatus('UNKNOWN')).toThrow(EncounterValidationError);
    expect(parsePositiveInteger('3', 1)).toBe(3);
    expect(parsePositiveInteger('999', 1, 100)).toBe(100);
    expect(parsePositiveInteger('nope', 1)).toBe(1);
  });
});
