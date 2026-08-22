import { ConflictException } from '@nestjs/common';
import { EncounterStatus } from '@prisma/client';
import type { EncounterWithRelations } from '../../encounters/encounter.repository';

export function assertHistoricalEncounterProjectionAllowed(
  encounter: EncounterWithRelations,
  encounterLink: { externalResourceId: string } | null,
  medicalRecordStatus: string | undefined,
): void {
  if (encounterLink) {
    throw new ConflictException({
      code: 'SATUSEHAT_ENCOUNTER_RECOVERY_ALREADY_LINKED',
      message:
        'Encounter sudah memiliki linkage; recovery historis tidak boleh menurunkan status remote.',
    });
  }
  if (encounter.status !== EncounterStatus.FINISHED) {
    throw new ConflictException({
      code: 'SATUSEHAT_ENCOUNTER_RECOVERY_NOT_APPLICABLE',
      message:
        'Recovery historis hanya berlaku untuk Encounter lokal FINISHED yang belum pernah terhubung.',
    });
  }
  if (medicalRecordStatus !== 'FINAL') {
    throw new ConflictException({
      code: 'SATUSEHAT_ENCOUNTER_RECOVERY_FINAL_RME_REQUIRED',
      message:
        'Recovery historis hanya boleh dilakukan setelah RME lokal berstatus FINAL.',
    });
  }
}

export function toHistoricalInProgressEncounter(
  encounter: EncounterWithRelations,
): EncounterWithRelations {
  const statusHistory = encounter.statusHistory
    .filter(
      (entry) =>
        entry.status === EncounterStatus.ARRIVED ||
        entry.status === EncounterStatus.IN_PROGRESS,
    )
    .sort(
      (left, right) => left.periodStart.getTime() - right.periodStart.getTime(),
    )
    .map((entry, index, entries) =>
      index === entries.length - 1 ? { ...entry, periodEnd: null } : entry,
    );

  return {
    ...encounter,
    status: EncounterStatus.IN_PROGRESS,
    completedAt: null,
    cancelledAt: null,
    statusHistory,
  };
}
