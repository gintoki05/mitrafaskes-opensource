import { EncounterStatus } from '@mitrafaskes/shared';
import {
  assertEncounterTransition,
  ENCOUNTER_TRANSITIONS,
} from './encounter.status-policy';
import { EncounterTransitionError } from './encounter.errors';

describe('Encounter status policy', () => {
  it.each([
    [EncounterStatus.WAITING, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.WAITING, EncounterStatus.CANCELLED],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.COMPLETED],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.CANCELLED],
  ])('allows %s -> %s', (current, next) => {
    expect(() => assertEncounterTransition(current, next)).not.toThrow();
  });

  it.each([
    [EncounterStatus.COMPLETED, EncounterStatus.WAITING],
    [EncounterStatus.COMPLETED, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.COMPLETED, EncounterStatus.CANCELLED],
    [EncounterStatus.CANCELLED, EncounterStatus.WAITING],
    [EncounterStatus.CANCELLED, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.CANCELLED, EncounterStatus.COMPLETED],
    [EncounterStatus.WAITING, EncounterStatus.COMPLETED],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.WAITING],
  ])('rejects terminal or invalid transition %s -> %s', (current, next) => {
    expect(() => assertEncounterTransition(current, next)).toThrow(
      EncounterTransitionError,
    );
  });

  it.each(Object.values(EncounterStatus))('rejects same status %s', (status) => {
    expect(() => assertEncounterTransition(status, status)).toThrow(
      EncounterTransitionError,
    );
  });

  it('keeps the transition matrix explicit', () => {
    expect(ENCOUNTER_TRANSITIONS).toEqual({
      WAITING: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    });
  });

});
