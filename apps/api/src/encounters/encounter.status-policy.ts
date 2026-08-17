import { EncounterStatus } from '@mitrafaskes/shared';
import { EncounterTransitionError } from './encounter.errors';

export const ENCOUNTER_TRANSITIONS: Readonly<
  Record<EncounterStatus, readonly EncounterStatus[]>
> = {
  [EncounterStatus.PLANNED]: [EncounterStatus.ARRIVED],
  [EncounterStatus.ARRIVED]: [
    EncounterStatus.IN_PROGRESS,
    EncounterStatus.CANCELLED,
    EncounterStatus.ENTERED_IN_ERROR,
  ],
  [EncounterStatus.IN_PROGRESS]: [
    EncounterStatus.ONLEAVE,
    EncounterStatus.FINISHED,
    EncounterStatus.ENTERED_IN_ERROR,
  ],
  [EncounterStatus.TRIAGED]: [
    EncounterStatus.IN_PROGRESS,
    EncounterStatus.ENTERED_IN_ERROR,
  ],
  [EncounterStatus.ONLEAVE]: [
    EncounterStatus.IN_PROGRESS,
    EncounterStatus.ENTERED_IN_ERROR,
  ],
  [EncounterStatus.FINISHED]: [EncounterStatus.ENTERED_IN_ERROR],
  [EncounterStatus.CANCELLED]: [EncounterStatus.ENTERED_IN_ERROR],
  [EncounterStatus.ENTERED_IN_ERROR]: [],
  [EncounterStatus.UNKNOWN]: [EncounterStatus.ENTERED_IN_ERROR],
};

export function assertEncounterTransition(
  current: EncounterStatus,
  next: EncounterStatus,
): void {
  if (current === next) {
    throw new EncounterTransitionError(
      `Encounter sudah berada pada status ${current}`,
      'ENCOUNTER_ALREADY_IN_STATUS',
    );
  }
  if (!ENCOUNTER_TRANSITIONS[current].includes(next)) {
    throw new EncounterTransitionError(
      `Perubahan status ${current} ke ${next} tidak diizinkan`,
      'INVALID_ENCOUNTER_TRANSITION',
    );
  }
}
