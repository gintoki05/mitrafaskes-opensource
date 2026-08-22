import assert from 'node:assert/strict';
import test from 'node:test';
import { EncounterStatus } from '@mitrafaskes/shared';
import type { Encounter } from '@mitrafaskes/shared';
import { getLatestPatientEncounter } from './patient-encounter-status.ts';

function encounter(
  id: string,
  status: EncounterStatus,
  createdAt: string,
  queueNumber: number,
): Encounter {
  return {
    id,
    encounterNumber: `ENC-${id}`,
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    organizationId: 'organization-1',
    locationId: 'location-1',
    queueDate: '2026-08-22',
    queueNumber,
    status,
    arrivedAt: createdAt,
    version: 1,
    statusHistory: [],
    createdAt,
    updatedAt: createdAt,
    integrations: [],
  };
}

test('current active visit takes precedence over a finished visit', () => {
  const result = getLatestPatientEncounter(
    [
      encounter('finished', EncounterStatus.FINISHED, '2026-08-22T01:00:00.000Z', 1),
      encounter('waiting', EncounterStatus.ARRIVED, '2026-08-22T02:00:00.000Z', 2),
    ],
    'patient-1',
  );

  assert.equal(result?.id, 'waiting');
});

test('returns no encounter for a patient without a current visit', () => {
  assert.equal(
    getLatestPatientEncounter(
      [encounter('other', EncounterStatus.ARRIVED, '2026-08-22T02:00:00.000Z', 1)],
      'patient-2',
    ),
    undefined,
  );
});
