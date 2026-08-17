// Compatibility barrel for domain services that still import the actor type.
export type { AuthenticatedRequest, AuthenticatedUser } from './session.guard';
export { SessionGuard } from './session.guard';
export { PermissionGuard } from './permission.guard';
