'use client';

import {
  AccessPermission,
  DEFAULT_ROUTE_BY_ROLE,
  hasPermission,
  UserRole,
} from '@mitrafaskes/shared';

const TOKEN_KEY = 'mitrafaskes_token';
const USER_KEY = 'mitrafaskes_user';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  sipNumber?: string;
}

export interface Session {
  accessToken: string;
  user: SessionUser;
}

function isUserRole(role: unknown): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!accessToken || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as SessionUser;
    return user?.id && user?.username && user?.fullName && isUserRole(user.role)
      ? { accessToken, user }
      : null;
  } catch {
    return null;
  }
}

export function saveSession(accessToken: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function can(user: SessionUser | null, permission: AccessPermission): boolean {
  return hasPermission(user?.role, permission);
}

export function defaultRoute(user: SessionUser): string {
  return DEFAULT_ROUTE_BY_ROLE[user.role];
}

export function authHeaders(): HeadersInit {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    headers: { ...authHeaders(), ...init.headers },
  });
  if (response.status === 401 && typeof window !== 'undefined') {
    clearSession();
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }
  return response;
}
