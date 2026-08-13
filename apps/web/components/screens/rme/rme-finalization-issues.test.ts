import assert from 'node:assert/strict';
import test from 'node:test';
import type { RmeValidationIssue } from '@mitrafaskes/shared';
import { rmeIssuesForSection } from './rme-finalization-issues.ts';

test('finalization issues are exposed beside their actionable section', () => {
  const issues: RmeValidationIssue[] = [
    { code: 'REQUIRED', field: 'chiefComplaint', section: 'anamnesis', message: 'Keluhan wajib.' },
    { code: 'REQUIRED', field: 'systolic', section: 'vitalSigns', message: 'Sistolik wajib.' },
    { code: 'REQUIRED', field: 'carePlan', section: 'plan', message: 'Rencana wajib.' },
  ];

  assert.deepEqual(rmeIssuesForSection(issues, 'vitalSigns'), [issues[1]]);
  assert.deepEqual(rmeIssuesForSection(issues, 'diagnoses'), []);
});
