import { isTriageEditable } from './triage.service';

describe('triage lifecycle', () => {
  it.each([
    ['WAITING', undefined],
    ['WAITING', 'DRAFT'],
    ['IN_PROGRESS', undefined],
    ['IN_PROGRESS', 'NOT_STARTED'],
    ['IN_PROGRESS', 'DRAFT'],
  ])(
    'allows an incomplete triage to be edited for %s',
    (encounterStatus, triageStatus) => {
      expect(isTriageEditable(encounterStatus, triageStatus)).toBe(true);
    },
  );

  it.each([
    ['IN_PROGRESS', 'COMPLETED'],
    ['COMPLETED', 'DRAFT'],
    ['CANCELLED', undefined],
  ])(
    'does not allow triage edits for %s/%s',
    (encounterStatus, triageStatus) => {
      expect(isTriageEditable(encounterStatus, triageStatus)).toBe(false);
    },
  );
});
