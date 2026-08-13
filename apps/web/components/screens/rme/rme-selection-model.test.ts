import assert from 'node:assert/strict';
import test from 'node:test';
import type { Encounter } from '@/lib/clinical-types';
import { reconcileRmeSelection } from './rme-selection-model.ts';

const encounter = (id: string, version = 1) => ({
  id,
  version,
} as Encounter);

test('post-finalization refresh retains a missing selection as a workspace snapshot', () => {
  const finalizedSelection = encounter('encounter-final', 3);
  const activeQueue = [encounter('encounter-active')];

  assert.equal(
    reconcileRmeSelection(finalizedSelection, activeQueue, true),
    finalizedSelection,
  );
  assert.equal(
    reconcileRmeSelection(finalizedSelection, [], true),
    finalizedSelection,
  );
});

test('ordinary refresh still falls back to the first active Encounter', () => {
  const activeQueue = [encounter('encounter-active')];

  assert.equal(
    reconcileRmeSelection(encounter('encounter-stale'), activeQueue, false),
    activeQueue[0],
  );
  assert.equal(
    reconcileRmeSelection(encounter('encounter-stale'), [], false),
    null,
  );
});

test('refresh replaces an existing selection with the latest queue snapshot', () => {
  const current = encounter('encounter-1', 1);
  const refreshed = encounter('encounter-1', 2);

  assert.equal(reconcileRmeSelection(current, [refreshed], true), refreshed);
});
