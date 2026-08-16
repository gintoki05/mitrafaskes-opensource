"use client";

import {
  AccessPermission,
  DEFAULT_ROUTE_BY_ROLE,
  hasPermission,
  UserRole,
  type AccessRoleSummary,
  type UserLocationReference,
  type UserOrganizationReference,
  WorkProfileType,
} from "@mitrafaskes/shared";
import { resolveApiInput } from "./api";

const SESSION_CHANGE_EVENT = "mitrafaskes:session-change";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  accessRole?: AccessRoleSummary;
  permissions?: string[];
  defaultRoute?: string;
  workProfileType?: WorkProfileType;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: string;
  sipNumber?: string;
  strNumber?: string;
  organization?: UserOrganizationReference;
  locations?: UserLocationReference[];
}

export interface Session {
  user: SessionUser;
}

let sessionSnapshot: Session | null | undefined =
  typeof window === "undefined" ? null : undefined;
let hasLoadedSessionSnapshot = false;
let sessionLoadPromise: Promise<void> | null = null;
let csrfToken: string | null = null;
let csrfLoadPromise: Promise<string> | null = null;

function isUserRole(role: unknown): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<SessionUser>;
  return Boolean(
    user.id && user.username && user.fullName && isUserRole(user.role),
  );
}

function notifySessionChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

function setSessionSnapshot(user: SessionUser | null): void {
  sessionSnapshot = user ? { user } : null;
  hasLoadedSessionSnapshot = true;
  notifySessionChange();
}

export function getSession(): Session | null | undefined {
  return sessionSnapshot;
}

export async function ensureSessionLoaded(): Promise<void> {
  if (typeof window === "undefined" || hasLoadedSessionSnapshot) return;
  if (sessionLoadPromise) return sessionLoadPromise;

  sessionLoadPromise = fetch(resolveApiInput("/api/auth/me"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) {
        setSessionSnapshot(null);
        return;
      }
      const data = (await response.json()) as { user?: unknown };
      setSessionSnapshot(isSessionUser(data.user) ? data.user : null);
    })
    .catch(() => {
      setSessionSnapshot(null);
    })
    .finally(() => {
      sessionLoadPromise = null;
    });

  return sessionLoadPromise;
}

export function setSession(user: SessionUser): void {
  setSessionSnapshot(user);
}

export function clearSession(): void {
  csrfToken = null;
  csrfLoadPromise = null;
  setSessionSnapshot(null);
}

export function subscribeToSession(onStoreChange: () => void): () => void {
  const handleSessionChange = () => onStoreChange();
  window.addEventListener(SESSION_CHANGE_EVENT, handleSessionChange);

  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, handleSessionChange);
  };
}

export function can(
  user: SessionUser | null,
  permission: AccessPermission,
): boolean {
  if (user?.accessRole?.system === 'SUPER_ADMIN') return true;
  if (user?.permissions) return user.permissions.includes(permission);
  return hasPermission(user?.role, permission);
}

export function defaultRoute(user: SessionUser): string {
  return user.defaultRoute ?? DEFAULT_ROUTE_BY_ROLE[user.role];
}

function isAuthTokenEndpoint(input: RequestInfo | URL): boolean {
  const value = typeof input === "string" ? input : input.toString();
  return value.endsWith("/api/auth/token");
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfLoadPromise) return csrfLoadPromise;

  csrfLoadPromise = fetch(resolveApiInput("/api/auth/csrf"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Tidak dapat menyiapkan keamanan form");
      const data = (await response.json()) as { csrfToken?: unknown };
      if (typeof data.csrfToken !== "string" || !data.csrfToken) {
        throw new Error("Token CSRF tidak tersedia");
      }
      csrfToken = data.csrfToken;
      return data.csrfToken;
    })
    .finally(() => {
      csrfLoadPromise = null;
    });

  return csrfLoadPromise;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const shouldProtect =
    unsafeMethods.has(method) && !isAuthTokenEndpoint(input);

  if (shouldProtect && typeof window !== "undefined") {
    headers.set("X-CSRF-Token", await ensureCsrfToken());
  }

  const response = await fetch(resolveApiInput(input), {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
  });

  const path = typeof input === "string" ? input : input.toString();
  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    !path.endsWith("/api/auth/login")
  ) {
    clearSession();
    if (window.location.pathname !== "/login")
      window.location.replace("/login");
  }
  return response;
}
