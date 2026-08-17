import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrganizationSummary } from '@mitrafaskes/shared';
import {
  resolveSingleOrganizationScope,
} from './organization-scope.ts';

const organization = (
  id: string,
  code: string,
  type: 'HEALTHCARE_FACILITY' | 'SUB_ORGANIZATION' = 'HEALTHCARE_FACILITY',
  parentId?: string,
) : OrganizationSummary => ({
    id,
    code,
    name: code,
    type,
    parentId,
    integrations: [],
    active: true,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  });

test('assigned account organization wins over other active roots', () => {
  const scope = resolveSingleOrganizationScope(
    [organization('org-a', 'FASKES-A'), organization('org-b', 'FASKES-B')],
    { id: 'org-b', code: 'FASKES-B', name: 'Faskes B' },
  );

  assert.equal(scope.reason, 'ASSIGNED');
  assert.equal(scope.organization?.id, 'org-b');
});

test('one active root is implicit when the account has no assignment', () => {
  const scope = resolveSingleOrganizationScope([
    organization('org-a', 'FASKES-A'),
    organization('org-unit', 'POLI-UMUM', 'SUB_ORGANIZATION', 'org-a'),
  ]);

  assert.equal(scope.reason, 'SINGLE_ACTIVE_ROOT');
  assert.equal(scope.organization?.id, 'org-a');
});

test('multiple active roots stay blocked instead of guessing', () => {
  const scope = resolveSingleOrganizationScope([
    organization('org-a', 'FASKES-A'),
    organization('org-b', 'FASKES-B'),
  ]);

  assert.equal(scope.reason, 'AMBIGUOUS');
  assert.equal(scope.organization, null);
  assert.equal(scope.activeRootCount, 2);
});
