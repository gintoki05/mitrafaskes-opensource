import assert from 'node:assert/strict';
import test from 'node:test';
import { EncounterStatus } from '@mitrafaskes/shared';
import {
  getLocalEncounterStatusLabel,
  getLocalEncounterStatusTooltip,
} from '../../../lib/encounter-status-display.ts';

test('local encounter statuses use operational Indonesian labels', () => {
  assert.equal(getLocalEncounterStatusLabel(EncounterStatus.ARRIVED), 'Menunggu');
  assert.equal(
    getLocalEncounterStatusLabel(EncounterStatus.IN_PROGRESS),
    'Sedang dilayani',
  );
  assert.equal(getLocalEncounterStatusLabel(EncounterStatus.FINISHED), 'Selesai');
});

test('local status tooltip does not expose the SATUSEHAT code as the label', () => {
  assert.match(
    getLocalEncounterStatusTooltip(EncounterStatus.ARRIVED),
    /^Status kunjungan lokal: Menunggu\./,
  );
  assert.doesNotMatch(
    getLocalEncounterStatusTooltip(EncounterStatus.ARRIVED),
    /\barrived\b/,
  );
});
