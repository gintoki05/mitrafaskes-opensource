import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEncounterSyncUiState, shouldRefreshEncounterListAfterSync } from '../encounters/encounter-sync-state.ts';
import {
  formatSatusehatRemoteStatus,
  getSatusehatEncounterStatus,
  getSatusehatEncounterStatusTooltip,
  getSatusehatStatusTooltip,
} from '../../satusehat/satusehat-status.ts';
import { EncounterStatus } from '@mitrafaskes/shared';

test('SATUSEHAT remote Encounter statuses are shown as provider codes', () => {
  assert.equal(formatSatusehatRemoteStatus('arrived'), 'arrived');
  assert.equal(formatSatusehatRemoteStatus('in-progress'), 'in-progress');
  assert.equal(formatSatusehatRemoteStatus('cancelled'), 'cancelled');
  assert.equal(formatSatusehatRemoteStatus('future-status'), 'future-status');
});

test('local Encounter statuses expose their SATUSEHAT code and tooltip', () => {
  assert.equal(getSatusehatEncounterStatus(EncounterStatus.WAITING), 'arrived');
  assert.equal(getSatusehatEncounterStatus(EncounterStatus.IN_PROGRESS), 'in-progress');
  assert.equal(getSatusehatEncounterStatus(EncounterStatus.COMPLETED), 'finished');
  assert.equal(getSatusehatEncounterStatus(EncounterStatus.CANCELLED), 'cancelled');
  assert.match(
    getSatusehatEncounterStatusTooltip(EncounterStatus.WAITING),
    /^arrived: /,
  );
});

test('all FHIR R4 Encounter status codes have tooltip text', () => {
  for (const status of [
    'planned',
    'arrived',
    'triaged',
    'in-progress',
    'onleave',
    'finished',
    'cancelled',
    'entered-in-error',
    'unknown',
  ]) {
    assert.match(getSatusehatStatusTooltip(status) ?? '', new RegExp(`^${status}: `));
  }
});

test('Encounter sync UI exposes loading and permission-disabled states', () => {
  assert.deepEqual(
    resolveEncounterSyncUiState({
      canSync: false,
      previewLoading: true,
      previewError: '',
      syncing: false,
    }),
    {
      phase: 'loading',
      connected: false,
      error: '',
      repeatSync: false,
      disabled: true,
      disabledReason: 'Peran Anda tidak memiliki izin sinkronisasi.',
    },
  );
});

test('Encounter sync UI keeps a connected linkage visible after a failed update', () => {
  const state = resolveEncounterSyncUiState({
    canSync: true,
    previewLoading: false,
    previewError: '',
    syncing: false,
    previewOperation: 'UPDATE',
    integration: {
      provider: 'SATUSEHAT',
      environment: 'sandbox',
      linkage: {
        externalResourceId: 'encounter-remote-42',
        lastSyncedAt: '2026-08-13T12:00:00.000Z',
      },
      latestSync: {
        status: 'FAILED',
        errorMessage: 'Remote menolak update Encounter.',
        updatedAt: '2026-08-13T12:05:00.000Z',
      },
    },
  });

  assert.equal(state.phase, 'error');
  assert.equal(state.connected, true);
  assert.equal(state.repeatSync, true);
  assert.equal(state.error, 'Remote menolak update Encounter.');
});

test('Encounter sync UI identifies a successful connected repeat-sync state', () => {
  const state = resolveEncounterSyncUiState({
    canSync: true,
    previewLoading: false,
    previewError: '',
    syncing: false,
    previewOperation: 'UPDATE',
    integration: {
      provider: 'SATUSEHAT',
      environment: 'sandbox',
      linkage: { externalResourceId: 'encounter-remote-42' },
      latestSync: {
        status: 'SUCCESS',
        updatedAt: '2026-08-13T12:00:00.000Z',
      },
    },
  });

  assert.equal(state.phase, 'connected');
  assert.equal(state.repeatSync, true);
  assert.equal(state.disabled, false);
});

test('Encounter list refreshes after both successful and failed sync attempts', () => {
  assert.equal(shouldRefreshEncounterListAfterSync('SUCCESS'), true);
  assert.equal(shouldRefreshEncounterListAfterSync('FAILED'), true);
});
