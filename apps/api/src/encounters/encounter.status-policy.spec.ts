import { EncounterStatus } from '@mitrafaskes/shared';
import {
  assertEncounterTransition,
  ENCOUNTER_TRANSITIONS,
} from './encounter.status-policy';
import { EncounterTransitionError } from './encounter.errors';

describe('Encounter status policy', () => {
  it.each([
    [EncounterStatus.PLANNED, EncounterStatus.ARRIVED],
    [EncounterStatus.ARRIVED, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.ARRIVED, EncounterStatus.CANCELLED],
    [EncounterStatus.ARRIVED, EncounterStatus.ENTERED_IN_ERROR],
    [EncounterStatus.TRIAGED, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.ONLEAVE],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.FINISHED],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.ENTERED_IN_ERROR],
    [EncounterStatus.ONLEAVE, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.FINISHED, EncounterStatus.ENTERED_IN_ERROR],
    [EncounterStatus.CANCELLED, EncounterStatus.ENTERED_IN_ERROR],
  ])('allows %s -> %s', (current, next) => {
    expect(() => assertEncounterTransition(current, next)).not.toThrow();
  });

  it.each([
    [EncounterStatus.ENTERED_IN_ERROR, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.FINISHED, EncounterStatus.ARRIVED],
    [EncounterStatus.FINISHED, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.FINISHED, EncounterStatus.CANCELLED],
    [EncounterStatus.CANCELLED, EncounterStatus.ARRIVED],
    [EncounterStatus.CANCELLED, EncounterStatus.IN_PROGRESS],
    [EncounterStatus.CANCELLED, EncounterStatus.FINISHED],
    [EncounterStatus.ARRIVED, EncounterStatus.FINISHED],
    [EncounterStatus.IN_PROGRESS, EncounterStatus.ARRIVED],
  ])('rejects terminal or invalid transition %s -> %s', (current, next) => {
    expect(() => assertEncounterTransition(current, next)).toThrow(
      EncounterTransitionError,
    );
  });

  it.each(Object.values(EncounterStatus))(
    'rejects same status %s',
    (status) => {
      expect(() => assertEncounterTransition(status, status)).toThrow(
        EncounterTransitionError,
      );
    },
  );

  it('keeps the transition matrix explicit', () => {
    expect(ENCOUNTER_TRANSITIONS).toEqual({
      planned: ['arrived'],
      arrived: ['in-progress', 'cancelled', 'entered-in-error'],
      triaged: ['in-progress', 'entered-in-error'],
      'in-progress': ['onleave', 'finished', 'entered-in-error'],
      onleave: ['in-progress', 'entered-in-error'],
      finished: ['entered-in-error'],
      cancelled: ['entered-in-error'],
      'entered-in-error': [],
      unknown: ['entered-in-error'],
    });
  });
});
