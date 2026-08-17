import type { SatusehatLocationRemoteSummary } from '@mitrafaskes/shared';

export function defaultLocationCode(
  item: SatusehatLocationRemoteSummary,
): string {
  const raw = item.identifierValue || item.name || item.externalResourceId;
  const normalized = raw
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return normalized || `LOCATION-${item.externalResourceId.slice(0, 8).toUpperCase()}`;
}

export function isValidLocationCode(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9._-]*$/.test(value);
}
