import { EncounterStatus } from '@mitrafaskes/shared';
import { isTriageEditable } from './triage.service';

describe('triage lifecycle', () => {
  it.each([
    [EncounterStatus.ARRIVED, undefined],
    [EncounterStatus.ARRIVED, 'DRAFT'],
    [EncounterStatus.IN_PROGRESS, undefined],
    [EncounterStatus.IN_PROGRESS, 'NOT_STARTED'],
    [EncounterStatus.IN_PROGRESS, 'DRAFT'],
  ])(
    'allows an incomplete triage to be edited for %s',
    (encounterStatus, triageStatus) => {
      expect(isTriageEditable(encounterStatus, triageStatus)).toBe(true);
    },
  );

  it.each([
    [EncounterStatus.IN_PROGRESS, 'COMPLETED'],
    [EncounterStatus.FINISHED, 'DRAFT'],
    [EncounterStatus.CANCELLED, undefined],
  ])(
    'does not allow triage edits for %s/%s',
    (encounterStatus, triageStatus) => {
      expect(isTriageEditable(encounterStatus, triageStatus)).toBe(false);
    },
  );
});
