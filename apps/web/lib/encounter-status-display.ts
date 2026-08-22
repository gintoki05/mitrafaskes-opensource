import { EncounterStatus } from '@mitrafaskes/shared';

/**
 * Operational labels for the local visit lifecycle.
 *
 * These labels intentionally stay separate from the SATUSEHAT/FHIR status
 * codes. The local workflow is what staff need to scan while they manage the
 * registration queue.
 */
export const localEncounterStatusLabels: Record<EncounterStatus, string> = {
  [EncounterStatus.PLANNED]: 'Terjadwal',
  [EncounterStatus.ARRIVED]: 'Menunggu',
  [EncounterStatus.TRIAGED]: 'Siap diperiksa',
  [EncounterStatus.IN_PROGRESS]: 'Sedang dilayani',
  [EncounterStatus.ONLEAVE]: 'Ditunda sementara',
  [EncounterStatus.FINISHED]: 'Selesai',
  [EncounterStatus.CANCELLED]: 'Dibatalkan',
  [EncounterStatus.ENTERED_IN_ERROR]: 'Salah input',
  [EncounterStatus.UNKNOWN]: 'Tidak diketahui',
};

const localEncounterStatusDescriptions: Record<EncounterStatus, string> = {
  [EncounterStatus.PLANNED]: 'Kunjungan sudah dibuat dan menunggu pasien tiba.',
  [EncounterStatus.ARRIVED]: 'Pasien sudah tiba dan sedang menunggu dilayani.',
  [EncounterStatus.TRIAGED]: 'Triase selesai dan pasien siap menunggu pemeriksaan.',
  [EncounterStatus.IN_PROGRESS]: 'Pasien sedang dilayani oleh tenaga kesehatan.',
  [EncounterStatus.ONLEAVE]: 'Pelayanan ditunda sementara dan dapat dilanjutkan.',
  [EncounterStatus.FINISHED]: 'Pelayanan lokal untuk kunjungan ini sudah selesai.',
  [EncounterStatus.CANCELLED]: 'Kunjungan dibatalkan dan tidak dilanjutkan.',
  [EncounterStatus.ENTERED_IN_ERROR]: 'Kunjungan ditandai sebagai salah input.',
  [EncounterStatus.UNKNOWN]: 'Status kunjungan lokal belum dikenali.',
};

export const localEncounterStatusTooltips: Record<EncounterStatus, string> =
  Object.fromEntries(
    Object.values(EncounterStatus).map((status) => [
      status,
      `Status kunjungan lokal: ${localEncounterStatusLabels[status]}. ${localEncounterStatusDescriptions[status]}`,
    ]),
  ) as Record<EncounterStatus, string>;

export function getLocalEncounterStatusLabel(status: EncounterStatus): string {
  return localEncounterStatusLabels[status];
}

export function getLocalEncounterStatusTooltip(status: EncounterStatus): string {
  return localEncounterStatusTooltips[status];
}

export function getLocalEncounterStatusClass(status: EncounterStatus): string {
  if (
    status === EncounterStatus.PLANNED ||
    status === EncounterStatus.ARRIVED ||
    status === EncounterStatus.ONLEAVE
  ) {
    return 'clinical-status-warning border text-xs font-semibold';
  }

  if (
    status === EncounterStatus.TRIAGED ||
    status === EncounterStatus.IN_PROGRESS
  ) {
    return 'border-primary/20 bg-primary/10 text-xs font-semibold text-primary';
  }

  if (
    status === EncounterStatus.CANCELLED ||
    status === EncounterStatus.ENTERED_IN_ERROR ||
    status === EncounterStatus.UNKNOWN
  ) {
    return 'clinical-status-error border text-xs font-semibold';
  }

  return 'clinical-status-success border text-xs font-semibold';
}
