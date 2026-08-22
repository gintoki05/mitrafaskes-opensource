import { EncounterStatus } from '@mitrafaskes/shared';
import type { Encounter } from '@mitrafaskes/shared';

/**
 * Select the visit that should represent a patient in today's directory.
 * Active visits take precedence over a terminal visit in case duplicate local
 * registrations exist for the same patient.
 */
export function getLatestPatientEncounter(
  encounters: readonly Encounter[],
  patientId: string,
): Encounter | undefined {
  return encounters
    .filter((encounter) => encounter.patientId === patientId)
    .sort(comparePatientEncounters)
    .at(-1);
}

const activeStatusRank: Readonly<Record<EncounterStatus, number>> = {
  [EncounterStatus.PLANNED]: 1,
  [EncounterStatus.ARRIVED]: 2,
  [EncounterStatus.TRIAGED]: 2,
  [EncounterStatus.IN_PROGRESS]: 2,
  [EncounterStatus.ONLEAVE]: 2,
  [EncounterStatus.FINISHED]: 0,
  [EncounterStatus.CANCELLED]: 0,
  [EncounterStatus.ENTERED_IN_ERROR]: -1,
  [EncounterStatus.UNKNOWN]: 0,
};

function comparePatientEncounters(a: Encounter, b: Encounter): number {
  const rankDifference = activeStatusRank[a.status] - activeStatusRank[b.status];
  if (rankDifference !== 0) return rankDifference;

  const createdAtDifference = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (Number.isFinite(createdAtDifference) && createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return a.queueNumber - b.queueNumber;
}
