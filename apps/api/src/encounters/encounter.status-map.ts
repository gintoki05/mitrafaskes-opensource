import { EncounterStatus as PrismaEncounterStatus } from '@prisma/client';
import { EncounterStatus } from '@mitrafaskes/shared';

/**
 * Prisma keeps identifier-safe enum member names while the shared API
 * contract exposes the canonical FHIR code.
 */
export const encounterStatusToPrisma: Readonly<
  Record<EncounterStatus, PrismaEncounterStatus>
> = {
  [EncounterStatus.PLANNED]: PrismaEncounterStatus.PLANNED,
  [EncounterStatus.ARRIVED]: PrismaEncounterStatus.ARRIVED,
  [EncounterStatus.TRIAGED]: PrismaEncounterStatus.TRIAGED,
  [EncounterStatus.IN_PROGRESS]: PrismaEncounterStatus.IN_PROGRESS,
  [EncounterStatus.ONLEAVE]: PrismaEncounterStatus.ONLEAVE,
  [EncounterStatus.FINISHED]: PrismaEncounterStatus.FINISHED,
  [EncounterStatus.CANCELLED]: PrismaEncounterStatus.CANCELLED,
  [EncounterStatus.ENTERED_IN_ERROR]: PrismaEncounterStatus.ENTERED_IN_ERROR,
  [EncounterStatus.UNKNOWN]: PrismaEncounterStatus.UNKNOWN,
};

export const encounterStatusFromPrisma: Readonly<
  Record<PrismaEncounterStatus, EncounterStatus>
> = {
  [PrismaEncounterStatus.PLANNED]: EncounterStatus.PLANNED,
  [PrismaEncounterStatus.ARRIVED]: EncounterStatus.ARRIVED,
  [PrismaEncounterStatus.TRIAGED]: EncounterStatus.TRIAGED,
  [PrismaEncounterStatus.IN_PROGRESS]: EncounterStatus.IN_PROGRESS,
  [PrismaEncounterStatus.ONLEAVE]: EncounterStatus.ONLEAVE,
  [PrismaEncounterStatus.FINISHED]: EncounterStatus.FINISHED,
  [PrismaEncounterStatus.CANCELLED]: EncounterStatus.CANCELLED,
  [PrismaEncounterStatus.ENTERED_IN_ERROR]: EncounterStatus.ENTERED_IN_ERROR,
  [PrismaEncounterStatus.UNKNOWN]: EncounterStatus.UNKNOWN,
};

export function toPrismaEncounterStatus(
  status: EncounterStatus,
): PrismaEncounterStatus {
  return encounterStatusToPrisma[status];
}

export function fromPrismaEncounterStatus(
  status: PrismaEncounterStatus | EncounterStatus,
): EncounterStatus {
  const mapped = encounterStatusFromPrisma[status as PrismaEncounterStatus];
  if (mapped) return mapped;
  if (Object.values(EncounterStatus).includes(status as EncounterStatus)) {
    return status as EncounterStatus;
  }
  throw new Error(`Status Encounter tidak dikenal: ${String(status)}`);
}
