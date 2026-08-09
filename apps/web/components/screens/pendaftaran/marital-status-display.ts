import type { MaritalStatusSummary } from '@mitrafaskes/shared';

export function maritalStatusDisplay(
  code: string | undefined,
  statuses: readonly MaritalStatusSummary[],
): string {
  if (!code) return 'Belum diisi';
  return statuses.find((status) => status.code === code)?.display ?? `Kode ${code}`;
}
