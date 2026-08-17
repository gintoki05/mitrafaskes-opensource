import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  MedicalRecordStatus as PrismaMedicalRecordStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@mitrafaskes/shared';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import {
  medicalRecordInclude,
  type MedicalRecordWithRelations,
} from './rme.mapper';
import {
  observationInputId,
  sourceObservationIdsForDerived,
  type RmeObservationDraft,
} from './rme.observation';
import type {
  ValidatedClinicalHistoryEntry,
  ValidatedMedicalRecordDraft,
} from './rme.validation';

export const finalizationInclude = {
  ...medicalRecordInclude,
  encounter: {
    include: {
      doctor: {
        select: {
          active: true,
          role: true,
          organizationId: true,
          locationId: true,
          locationAssignments: { select: { locationId: true } },
        },
      },
    },
  },
} satisfies Prisma.MedicalRecordInclude;

export type LockedEncounter = {
  id: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  version: number;
  doctorId: string;
  organizationId: string;
  locationId: string;
};

export type LockedMedicalRecord = {
  id: string;
  status: PrismaMedicalRecordStatus;
  version: number;
  triageStatus?: string;
};

export async function replaceDraftDiagnoses(
  transaction: Prisma.TransactionClient,
  medicalRecordId: string,
  diagnoses: ValidatedMedicalRecordDraft['diagnoses'],
): Promise<void> {
  const delegate = transaction.diagnosis;
  if (!delegate) return;

  const existing = await delegate.findMany({
    where: { medicalRecordId },
    select: { id: true, icd10Code: true },
  });
  const existingById = new Map(
    existing.map((diagnosis) => [diagnosis.id, diagnosis]),
  );
  const existingByCode = new Map<string, (typeof existing)[number]>();
  for (const diagnosis of existing) {
    if (!existingByCode.has(diagnosis.icd10Code)) {
      existingByCode.set(diagnosis.icd10Code, diagnosis);
    }
  }
  const keptIds = new Set<string>();

  for (const diagnosis of diagnoses) {
    const matched =
      (diagnosis.id ? existingById.get(diagnosis.id) : undefined) ??
      existingByCode.get(diagnosis.icd10Code);
    const data = {
      icd10Code: diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
    };
    if (matched && !keptIds.has(matched.id)) {
      keptIds.add(matched.id);
      await delegate.update({ where: { id: matched.id }, data });
    } else {
      const created = await delegate.create({
        data: { medicalRecordId, ...data },
      });
      keptIds.add(created.id);
    }
  }

  const removedIds = existing
    .map((diagnosis) => diagnosis.id)
    .filter((id) => !keptIds.has(id));
  if (removedIds.length > 0) {
    await delegate.deleteMany({ where: { id: { in: removedIds } } });
  }
}

export async function replaceDraftObservations(
  transaction: Prisma.TransactionClient,
  medicalRecordId: string,
  observations: readonly RmeObservationDraft[],
): Promise<void> {
  const delegate = transaction.clinicalObservation;
  if (!delegate || typeof delegate.findMany !== 'function') return;

  const existing = await delegate.findMany({
    where: { medicalRecordId },
    select: { id: true, code: true },
  });
  const existingById = new Map(
    existing.map((observation) => [observation.id, observation]),
  );
  const existingByCode = new Map<string, (typeof existing)[number]>();
  for (const observation of existing) {
    if (!existingByCode.has(observation.code)) {
      existingByCode.set(observation.code, observation);
    }
  }
  const keptIds = new Set<string>();
  const prepared = observations.map((observation) => {
    const matched =
      (observation.id ? existingById.get(observation.id) : undefined) ??
      (!observation.id ? existingByCode.get(observation.code) : undefined);
    // Only reuse an id that belongs to this MedicalRecord. A caller-provided
    // id for a different record must not be able to move or collide with a
    // child row outside the current draft.
    const id = matched?.id ?? observationInputId();
    keptIds.add(id);
    if (existingByCode.get(observation.code)?.id === id) {
      existingByCode.delete(observation.code);
    }
    return { ...observation, id };
  });

  for (const observation of prepared) {
    const derivedFromObservationIds = sourceObservationIdsForDerived(
      observation,
      prepared,
    );
    const data = observationData({
      ...observation,
      derivedFromObservationIds,
    });
    const existed = existingById.has(observation.id);
    if (existed) {
      await delegate.update({ where: { id: observation.id }, data });
    } else {
      await delegate.create({
        data: { id: observation.id, medicalRecordId, ...data },
      });
    }
  }

  const removedIds = existing
    .map((observation) => observation.id)
    .filter((id) => !keptIds.has(id));
  if (removedIds.length > 0 && typeof delegate.deleteMany === 'function') {
    await delegate.deleteMany({ where: { id: { in: removedIds } } });
  }
}

export async function replaceDraftHistories(
  transaction: Prisma.TransactionClient,
  medicalRecordId: string,
  histories: readonly ValidatedClinicalHistoryEntry[],
): Promise<void> {
  const delegate = transaction.clinicalHistoryEntry;
  if (!delegate || typeof delegate.findMany !== 'function') return;

  const existing = await delegate.findMany({
    where: { medicalRecordId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((history) => history.id));
  const keptIds = new Set<string>();

  for (const history of histories) {
    const id =
      history.id && existingIds.has(history.id) ? history.id : randomUUID();
    keptIds.add(id);
    const data = {
      category: history.category,
      text: history.text,
      status: history.status ?? null,
      onsetAt: history.onsetAt ?? null,
      note: history.note ?? null,
    };
    if (existingIds.has(id)) {
      await delegate.update({ where: { id }, data });
    } else {
      await delegate.create({ data: { id, medicalRecordId, ...data } });
    }
  }

  const removedIds = existing
    .map((history) => history.id)
    .filter((id) => !keptIds.has(id));
  if (removedIds.length > 0 && typeof delegate.deleteMany === 'function') {
    await delegate.deleteMany({ where: { id: { in: removedIds } } });
  }
}

export function observationData(
  observation: RmeObservationDraft,
): Omit<
  Prisma.ClinicalObservationUncheckedCreateInput,
  'id' | 'medicalRecordId'
> {
  return {
    category: observation.category,
    codeSystem: observation.codeSystem ?? null,
    code: observation.code,
    codeDisplay: observation.codeDisplay ?? null,
    valueType: observation.valueType,
    valueQuantityValue: observation.valueQuantityValue ?? null,
    valueQuantityUnit: observation.valueQuantityUnit ?? null,
    valueQuantitySystem: observation.valueQuantitySystem ?? null,
    valueQuantityCode: observation.valueQuantityCode ?? null,
    valueCodeSystem: observation.valueCodeSystem ?? null,
    valueCode: observation.valueCode ?? null,
    valueCodeDisplay: observation.valueCodeDisplay ?? null,
    valueBoolean: observation.valueBoolean ?? null,
    valueString: observation.valueString ?? null,
    effectiveAt: observation.effectiveAt ?? new Date(),
    performerId: observation.performerId ?? null,
    status: observation.status,
    provenance: observation.provenance,
    derivedFromObservationIds: observation.derivedFromObservationIds,
    referenceRangeLow: observation.referenceRangeLow ?? null,
    referenceRangeHigh: observation.referenceRangeHigh ?? null,
    interpretationCode: observation.interpretationCode ?? null,
    interpretationDisplay: observation.interpretationDisplay ?? null,
  };
}

export async function readMedicalRecordAfterChildReplacement(
  transaction: Prisma.TransactionClient,
  id: string,
  fallback: MedicalRecordWithRelations,
): Promise<MedicalRecordWithRelations> {
  if (
    !transaction.diagnosis &&
    !transaction.clinicalObservation &&
    !transaction.clinicalHistoryEntry
  ) {
    return fallback;
  }
  const refreshed = await transaction.medicalRecord.findUnique({
    where: { id },
    include: medicalRecordInclude,
  });
  return refreshed ?? fallback;
}

export async function requireDraft(
  transaction: Prisma.TransactionClient,
  encounterId: string,
): Promise<LockedMedicalRecord> {
  const current = await lockMedicalRecord(transaction, encounterId);
  if (!current) {
    throw new ConflictException({
      code: 'RME_DRAFT_REQUIRED',
      message: 'Simpan draft RME sebelum melakukan finalisasi.',
    });
  }
  return current;
}

export async function readFinalizationDraft(
  transaction: Prisma.TransactionClient,
  id: string,
) {
  const draft = await transaction.medicalRecord.findUnique({
    where: { id },
    include: finalizationInclude,
  });
  if (!draft) throw new NotFoundException('RME tidak ditemukan');
  return draft;
}

export async function readMedicalRecord(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<MedicalRecordWithRelations> {
  const record = await transaction.medicalRecord.findUnique({
    where: { id },
    include: medicalRecordInclude,
  });
  if (!record) throw new NotFoundException('RME tidak ditemukan');
  return record;
}

export async function lockEncounter(
  transaction: Prisma.TransactionClient,
  encounterId: string,
): Promise<LockedEncounter> {
  const rows = await transaction.$queryRaw<LockedEncounter[]>(
    Prisma.sql`SELECT "id", "status", "version", "doctorId", "organizationId", "locationId" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE`,
  );
  if (!rows[0]) {
    throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
  }
  return rows[0];
}

export async function lockMedicalRecord(
  transaction: Prisma.TransactionClient,
  encounterId: string,
): Promise<LockedMedicalRecord | null> {
  const rows = await transaction.$queryRaw<LockedMedicalRecord[]>(
    Prisma.sql`SELECT "id", "status", "version", "triageStatus" FROM "MedicalRecord" WHERE "encounterId" = ${encounterId} FOR UPDATE`,
  );
  return rows[0] ?? null;
}

export function assertEncounterInProgress(encounter: LockedEncounter): void {
  if (encounter.status !== 'IN_PROGRESS') {
    throw new ConflictException({
      code: 'RME_ENCOUNTER_NOT_IN_PROGRESS',
      message: 'Encounter harus berstatus IN_PROGRESS untuk menulis RME.',
    });
  }
}

export function assertDoctorAssignment(
  encounterDoctorId: string,
  actor: AuthenticatedUser,
  actorUserId: string | undefined,
): void {
  if (actor.role === UserRole.DOKTER && actorUserId !== encounterDoctorId) {
    throw new ForbiddenException({
      code: 'ENCOUNTER_NOT_ASSIGNED_TO_DOCTOR',
      message: 'Encounter ini ditugaskan kepada dokter lain.',
    });
  }
}

export async function resolveActorUserId(
  prisma: PrismaService,
  actor: AuthenticatedUser,
): Promise<string | undefined> {
  const user = await prisma.user.findUnique({
    where: { username: actor.username },
    select: { id: true },
  });
  return user?.id;
}

export function assertExpectedVersion(current: number, expected: number): void {
  if (current !== expected) {
    throw new ConflictException({
      code: 'RME_VERSION_CONFLICT',
      message: 'RME sudah berubah. Muat ulang data sebelum mencoba lagi.',
      currentVersion: current,
    });
  }
}
