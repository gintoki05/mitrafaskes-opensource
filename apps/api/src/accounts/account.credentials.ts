import { randomBytes } from 'node:crypto';

export const TEMPORARY_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

export function generateTemporaryPassword(): string {
  return randomBytes(18).toString('base64url').slice(0, 20);
}

export function temporaryPasswordExpiry(now = Date.now()): Date {
  return new Date(now + TEMPORARY_PASSWORD_TTL_MS);
}
