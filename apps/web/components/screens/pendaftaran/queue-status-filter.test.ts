import assert from 'node:assert/strict';
import test from 'node:test';
import { EncounterStatus } from '@mitrafaskes/shared';
import { ACTIVE_ENCOUNTER_STATUSES } from '../../../lib/encounter-statuses.ts';

test('active queue includes every non-terminal clinical status', () => {
  assert.deepEqual(ACTIVE_ENCOUNTER_STATUSES, [
    EncounterStatus.ARRIVED,
    EncounterStatus.TRIAGED,
    EncounterStatus.IN_PROGRESS,
    EncounterStatus.ONLEAVE,
  ]);
});
