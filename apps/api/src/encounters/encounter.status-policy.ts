import { EncounterStatus } from '@mitrafaskes/shared';
import { EncounterTransitionError } from './encounter.errors';

export const ENCOUNTER_TRANSITIONS: Readonly<
  Record<EncounterStatus, readonly EncounterStatus[]>
> = {
  [EncounterStatus.WAITING]: [
    EncounterStatus.IN_PROGRESS,
    EncounterStatus.CANCELLED,
  ],
  [EncounterStatus.IN_PROGRESS]: [
    EncounterStatus.COMPLETED,
    EncounterStatus.CANCELLED,
  ],
  [EncounterStatus.COMPLETED]: [],
  [EncounterStatus.CANCELLED]: [],
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
