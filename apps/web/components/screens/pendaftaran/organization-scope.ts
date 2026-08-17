import type {
  OrganizationSummary,
  UserOrganizationReference,
} from '@mitrafaskes/shared';

export type OrganizationScopeReason =
  | 'ASSIGNED'
  | 'SINGLE_ACTIVE_ROOT'
  | 'AMBIGUOUS'
  | 'UNAVAILABLE';

export type OrganizationScope = {
  organization: OrganizationSummary | null;
  reason: OrganizationScopeReason;
  activeRootCount: number;
};

/**
 * Resolves the one operational Organization used by day-to-day registration.
 * An assigned account context wins; otherwise a tenant with one active root
 * faskes can use that root implicitly. Multiple roots stay blocked so the UI
 * never silently registers a patient in the wrong facility.
 */
export function resolveSingleOrganizationScope(
  organizations: OrganizationSummary[],
  assignedOrganization?: UserOrganizationReference,
): OrganizationScope {
  const activeRoots = organizations.filter(
    (organization) =>
      organization.active &&
      organization.type === 'HEALTHCARE_FACILITY' &&
      !organization.parentId,
  );

  if (assignedOrganization) {
    const scopedOrganization = organizations.find(
      (organization) =>
        organization.id === assignedOrganization.id && organization.active,
    );
    if (scopedOrganization) {
      return {
        organization: scopedOrganization,
        reason: 'ASSIGNED',
        activeRootCount: activeRoots.length,
      };
    }
  }

  if (activeRoots.length === 1) {
    return {
      organization: activeRoots[0],
      reason: 'SINGLE_ACTIVE_ROOT',
      activeRootCount: activeRoots.length,
    };
  }

  return {
    organization: null,
    reason: activeRoots.length > 1 ? 'AMBIGUOUS' : 'UNAVAILABLE',
    activeRootCount: activeRoots.length,
  };
}

