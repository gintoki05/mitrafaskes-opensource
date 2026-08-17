export interface AuthConfig {
  cookieName: string;
  cookieSecure: boolean;
  sessionTtlMs: number;
  sessionIdleTtlMs: number;
  csrfSecret: string;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAuthConfig(): AuthConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const csrfSecret = process.env.AUTH_CSRF_SECRET?.trim();

  if (isProduction && !csrfSecret) {
    throw new Error('AUTH_CSRF_SECRET wajib diisi pada environment production');
  }

  return {
    cookieName: process.env.AUTH_COOKIE_NAME?.trim() || 'mitrafaskes_session',
    cookieSecure:
      process.env.AUTH_COOKIE_SECURE === 'true' ||
      (isProduction && process.env.AUTH_COOKIE_SECURE !== 'false'),
    sessionTtlMs:
      positiveInteger(process.env.AUTH_SESSION_TTL_SECONDS, 43_200) * 1_000,
    sessionIdleTtlMs:
      positiveInteger(process.env.AUTH_SESSION_IDLE_TTL_SECONDS, 7_200) * 1_000,
    csrfSecret:
      csrfSecret ||
      'development-only-change-this-auth-csrf-secret-before-deployment',
  };
}

export function getAllowedWebOrigins(): string[] {
  return (process.env.WEB_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
