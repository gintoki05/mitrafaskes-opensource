import assert from 'node:assert/strict';
import test from 'node:test';
import {
  backoffLabel,
  failureCategoryLabel,
  operatorActionLabel,
  retryAfterLabel,
  retryAvailable,
} from './satusehat-log-display.ts';

const baseLog = {
  id: 'log-1',
  provider: 'SATUSEHAT',
  environment: 'sandbox',
  resourceType: 'Encounter',
  resourceId: 'enc-1',
  status: 'FAILED' as const,
  updatedAt: '2026-08-13T12:00:00.000Z',
  retryable: true,
};

test('monitoring labels failure category and operator action', () => {
  assert.equal(failureCategoryLabel('REFERENCE_MISSING'), 'Dependency/reference');
  assert.equal(operatorActionLabel('FIX_REFERENCE'), 'Hubungkan dependency');
});

test('retry button is unavailable during persisted backoff', () => {
  const log = {
    ...baseLog,
    retryAfterAt: '2026-08-13T12:05:00.000Z',
  };

  assert.equal(retryAvailable(log, Date.parse('2026-08-13T12:04:59.000Z')), false);
  assert.equal(retryAvailable(log, Date.parse('2026-08-13T12:05:00.000Z')), true);
  assert.match(
    retryAfterLabel(log.retryAfterAt, Date.parse('2026-08-13T12:04:59.000Z')) ?? '',
    /^Retry tersedia setelah /,
  );
  assert.equal(backoffLabel(30_000), 'Backoff 30 detik');
});

test('non-retryable failures never expose an operator retry action', () => {
  assert.equal(
    retryAvailable({ ...baseLog, retryable: false }),
    false,
  );
});
