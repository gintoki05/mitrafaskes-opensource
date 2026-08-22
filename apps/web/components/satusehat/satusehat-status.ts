import type { EncounterStatus } from '@mitrafaskes/shared';

export type SatusehatEncounterStatusCode =
  | 'planned'
  | 'arrived'
  | 'triaged'
  | 'in-progress'
  | 'onleave'
  | 'finished'
  | 'cancelled'
  | 'entered-in-error'
  | 'unknown';

/** Plain-language explanations for the EncounterStatus codes from FHIR R4. */
const encounterStatusDescriptions: Readonly<
  Record<SatusehatEncounterStatusCode, string>
> = {
  planned: 'Kunjungan belum dimulai.',
  arrived: 'Pasien sudah tiba, tetapi belum bertemu tenaga kesehatan.',
  triaged: 'Pasien sudah dinilai prioritasnya melalui triase.',
  'in-progress': 'Kunjungan sedang berlangsung dan pasien sedang dilayani.',
  onleave: 'Kunjungan sedang berlangsung, tetapi pasien sementara meninggalkan layanan.',
  finished: 'Kunjungan sudah selesai.',
  cancelled: 'Kunjungan dibatalkan.',
  'entered-in-error': 'Data kunjungan dinyatakan salah input dan tidak valid.',
  unknown: 'Status kunjungan tidak diketahui.',
};

const localEncounterStatusMap: Readonly<
  Record<EncounterStatus, SatusehatEncounterStatusCode>
> = {
  planned: 'planned',
  arrived: 'arrived',
  triaged: 'triaged',
  'in-progress': 'in-progress',
  onleave: 'onleave',
  finished: 'finished',
  cancelled: 'cancelled',
  'entered-in-error': 'entered-in-error',
  unknown: 'unknown',
};

function normalizeStatus(status?: string): string | undefined {
  const normalized = status?.trim().toLowerCase();
  return normalized || undefined;
}

export function getSatusehatEncounterStatus(
  status: EncounterStatus,
): SatusehatEncounterStatusCode {
  return localEncounterStatusMap[status];
}

export function getSatusehatEncounterStatusTooltip(
  status: EncounterStatus,
): string {
  const code = getSatusehatEncounterStatus(status);
  return `${code}: ${encounterStatusDescriptions[code]}`;
}

export function getSatusehatStatusTooltip(status?: string): string | undefined {
  const normalized = normalizeStatus(status);
  if (!normalized) return undefined;

  const description = encounterStatusDescriptions[
    normalized as SatusehatEncounterStatusCode
  ];
  return description
    ? `${normalized}: ${description}`
    : `Status SATUSEHAT: ${normalized}.`;
}

export function formatSatusehatRemoteStatus(
  status?: string,
): string | undefined {
  return normalizeStatus(status);
}
