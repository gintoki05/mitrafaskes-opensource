import {
  AccessPermission,
} from '@mitrafaskes/shared';
import { can } from './auth';
import type { SessionUser } from './auth';

const LAST_ROUTE_STORAGE_KEY = 'mitrafaskes:last-route';

const ROUTE_PERMISSIONS = [
  { prefix: '/pendaftaran', permission: AccessPermission.QUEUE_READ },
  { prefix: '/rme', permission: AccessPermission.RME_READ },
  { prefix: '/triase', permission: AccessPermission.RME_TRIAGE_READ },
  { prefix: '/master-data', permission: AccessPermission.MASTER_DATA_READ },
  { prefix: '/master-faskes', permission: AccessPermission.MASTER_DATA_READ },
  { prefix: '/satusehat', permission: AccessPermission.SYNC_STATUS_READ },
  { prefix: '/administrasi/akun', permission: AccessPermission.ACCOUNT_READ },
  { prefix: '/administrasi/role', permission: AccessPermission.ROLE_READ },
] as const;

type RouteUser = SessionUser;

type StoredRoute = {
  userId: string;
  pathname: string;
};

function getRouteStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function permissionForRoute(pathname: string): AccessPermission | null {
  const route = ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return route?.permission ?? null;
}

function canRestoreRoute(user: RouteUser, pathname: string): boolean {
  const permission = permissionForRoute(pathname);
  return Boolean(permission && can(user, permission));
}

function isStoredRoute(value: unknown): value is StoredRoute {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<StoredRoute>;
  return typeof candidate.userId === 'string' && typeof candidate.pathname === 'string';
}

export function rememberLastRoute(user: RouteUser, pathname: string): void {
  const storage = getRouteStorage();
  if (!storage || !user.id || !canRestoreRoute(user, pathname)) return;

  try {
    storage.setItem(
      LAST_ROUTE_STORAGE_KEY,
      JSON.stringify({ userId: user.id, pathname } satisfies StoredRoute),
    );
  } catch {
    // Route memory is best-effort and must never block navigation.
  }
}

export function getLastRoute(user: RouteUser): string | null {
  const storage = getRouteStorage();
  if (!storage) return null;

  try {
    const rawRoute = storage.getItem(LAST_ROUTE_STORAGE_KEY);
    if (!rawRoute) return null;

    const parsedRoute: unknown = JSON.parse(rawRoute);
    if (
      !isStoredRoute(parsedRoute) ||
      parsedRoute.userId !== user.id ||
      !canRestoreRoute(user, parsedRoute.pathname)
    ) {
      return null;
    }

    return parsedRoute.pathname;
  } catch {
    return null;
  }
}
