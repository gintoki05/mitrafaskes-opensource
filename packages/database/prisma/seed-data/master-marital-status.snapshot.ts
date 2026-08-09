export const MASTER_MARITAL_STATUS_SNAPSHOT_VERSION =
  '2026.08-marital-status-baseline-1';

export interface MasterMaritalStatusSeedRecord {
  code: string;
  display: string;
  displayOrder: number;
}

/**
 * Offline canonical terminology for Patient.maritalStatusCode. Codes are
 * stable, provider-neutral vocabulary values; labels are optimized for the
 * Indonesian registration workflow.
 */
export const MASTER_MARITAL_STATUS_SNAPSHOT: readonly MasterMaritalStatusSeedRecord[] = [
  { code: 'S', display: 'Belum menikah', displayOrder: 10 },
  { code: 'M', display: 'Menikah', displayOrder: 20 },
  { code: 'D', display: 'Cerai hidup', displayOrder: 30 },
  { code: 'W', display: 'Cerai mati', displayOrder: 40 },
  { code: 'L', display: 'Berpisah secara hukum', displayOrder: 50 },
  { code: 'P', display: 'Poligami', displayOrder: 60 },
  { code: 'T', display: 'Pasangan domestik', displayOrder: 70 },
  { code: 'A', display: 'Perkawinan dibatalkan', displayOrder: 80 },
  { code: 'I', display: 'Dalam proses perceraian', displayOrder: 90 },
  { code: 'U', display: 'Tidak menikah', displayOrder: 100 },
];
