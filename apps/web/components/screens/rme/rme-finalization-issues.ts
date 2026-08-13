import type {
  RmeValidationIssue,
  RmeValidationSection,
} from '@mitrafaskes/shared';

export function rmeIssuesForSection(
  issues: RmeValidationIssue[],
  section: RmeValidationSection,
): RmeValidationIssue[] {
  return issues.filter((entry) => entry.section === section);
}
