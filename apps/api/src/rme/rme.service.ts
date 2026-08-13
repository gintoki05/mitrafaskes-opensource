import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { MedicalRecordStatus as PrismaMedicalRecordStatus, Prisma } from '@prisma/client';
import { type MedicalRecord, type RmePreflightResult } from '@mitrafaskes/shared';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { IntegrationRegistry } from '../integrations/integration-registry';
import { validateFinalization } from './rme.finalization-profile';
import { medicalRecordInclude, toMedicalRecord, type MedicalRecordWithRelations } from './rme.mapper';
import {
  buildObservationDrafts,
  observationInputId,
  projectLegacyVitals,
  sourceObservationIdsForDerived,
  type RmeObservationDraft,
} from './rme.observation';
import {
  parseDraftInput,
  parseFinalizeInput,
  parsePreflightInput,
  type ValidatedMedicalRecordDraft,
} from './rme.validation';

const finalizationInclude = {
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

type LockedEncounter = {
  id: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  version: number;
  doctorId: string;
  organizationId: string;
  locationId: string;
};

type LockedMedicalRecord = {
  id: string;
  status: PrismaMedicalRecordStatus;
  version: number;
};

export type RmeRequestMetadata = {
  requestId: string;
  correlationId: string;
};

@Injectable()
export class RmeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encounters: EncountersService,
    @Optional() private readonly integrations?: IntegrationRegistry,
  ) {}

  async findByEncounterId(encounterId: string, actor: AuthenticatedUser): Promise<MedicalRecord | null> {
    const actorUserId = await this.resolveActorUserId(actor);
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { doctorId: true },
    });
    if (!encounter) throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    this.assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
    const record = await this.prisma.medicalRecord.findUnique({
      where: { encounterId },
      include: medicalRecordInclude,
    });
    return record ? this.toResponse(record) : null;
  }

  async saveDraft(input: unknown, actor: AuthenticatedUser): Promise<MedicalRecord> {
    const draft = parseDraftInput(input);
    const actorUserId = await this.resolveActorUserId(actor);

    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await this.lockEncounter(transaction, draft.encounterId);
      this.assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      this.assertEncounterInProgress(encounter);
      const current = await this.lockMedicalRecord(transaction, draft.encounterId);
      if (current?.status === PrismaMedicalRecordStatus.FINAL) {
        throw new ConflictException({
          code: 'RME_FINAL_IMMUTABLE',
          message: 'RME yang sudah final tidak dapat diubah melalui simpan draft.',
        });
      }
      this.assertExpectedVersion(current?.version ?? 0, draft.expectedVersion);

      const now = new Date();
      const observations = buildObservationDrafts(
        draft.observations,
        {
          systolic: draft.systolic,
          diastolic: draft.diastolic,
          heartRate: draft.heartRate,
          temperature: draft.temperature,
          weight: draft.weight,
          height: draft.height,
        },
        now,
        actorUserId,
      );
      const projectedVitals = projectLegacyVitals(observations);
      const clinicalData = {
        chiefComplaint: draft.chiefComplaint ?? null,
        presentIllness: draft.presentIllness ?? null,
        allergyReviewStatus: draft.allergyReviewStatus ?? null,
        allergyDetails: draft.allergyDetails ?? null,
        physicalExam: draft.physicalExam ?? null,
        education: draft.education ?? null,
        carePlan: draft.carePlan ?? null,
        disposition: draft.disposition ?? null,
        anamnesis: draft.anamnesis ?? null,
        systolic: projectedVitals.systolic ?? draft.systolic ?? null,
        diastolic: projectedVitals.diastolic ?? draft.diastolic ?? null,
        heartRate: projectedVitals.heartRate ?? draft.heartRate ?? null,
        temperature: projectedVitals.temperature ?? draft.temperature ?? null,
        weight: projectedVitals.weight ?? draft.weight ?? null,
        height: projectedVitals.height ?? draft.height ?? null,
        authoredBy: actor.username,
        authoredAt: now,
        serviceProfile: draft.serviceProfile,
        validationProfile: draft.validationProfile,
      };
      if (!current) {
        const created = await transaction.medicalRecord.create({
          data: {
            encounterId: draft.encounterId,
            ...clinicalData,
            status: PrismaMedicalRecordStatus.DRAFT,
            version: 1,
            diagnoses: {
              create: draft.diagnoses.map((diagnosis) => ({
                icd10Code: diagnosis.icd10Code,
                isPrimary: diagnosis.isPrimary,
              })),
            },
            prescriptions: { create: draft.prescriptions },
          },
          include: medicalRecordInclude,
        });
        await this.replaceDraftObservations(transaction, created.id, observations);
        return this.readMedicalRecordAfterChildReplacement(
          transaction,
          created.id,
          created,
        );
      }

      const updated = await transaction.medicalRecord.update({
        where: { id: current.id },
        data: {
          ...clinicalData,
          version: { increment: 1 },
          prescriptions: { deleteMany: {}, create: draft.prescriptions },
        },
        include: medicalRecordInclude,
      });
      await this.replaceDraftDiagnoses(transaction, current.id, draft.diagnoses);
      await this.replaceDraftObservations(transaction, current.id, observations);
      return this.readMedicalRecordAfterChildReplacement(
        transaction,
        current.id,
        updated,
      );
    });
    return this.toResponse(record);
  }

  async preflight(input: unknown, actor: AuthenticatedUser): Promise<RmePreflightResult> {
    const command = parsePreflightInput(input);
    const actorUserId = await this.resolveActorUserId(actor);
    return this.prisma.$transaction(async (transaction) => {
      const encounter = await this.lockEncounter(transaction, command.encounterId);
      this.assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      const current = await this.requireDraft(transaction, command.encounterId);
      if (current.status === PrismaMedicalRecordStatus.FINAL) {
        throw new ConflictException({
          code: 'RME_ALREADY_FINAL',
          message: 'RME sudah final. Muat ulang catatan untuk melihat versi terbaru.',
        });
      }
      this.assertExpectedVersion(current.version, command.expectedVersion);
      const draft = await this.readFinalizationDraft(transaction, current.id);
      return validateFinalization(draft);
    });
  }

  async finalize(input: unknown, actor: AuthenticatedUser, request: RmeRequestMetadata): Promise<MedicalRecord> {
    const command = parseFinalizeInput(input);
    const actorUserId = await this.resolveActorUserId(actor);
    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await this.lockEncounter(transaction, command.encounterId);
      this.assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      const current = await this.requireDraft(transaction, command.encounterId);
      const priorAudit = await transaction.medicalRecordAuditEvent.findUnique({
        where: { idempotencyKey: command.idempotencyKey },
      });

      if (priorAudit) {
        const isSameRequest =
          priorAudit.medicalRecordId === current.id &&
          priorAudit.expectedVersion === command.expectedVersion &&
          priorAudit.action === 'RME_FINALIZED';
        if (
          isSameRequest &&
          current.status === PrismaMedicalRecordStatus.FINAL &&
          current.version === priorAudit.entityVersion &&
          encounter.status === 'COMPLETED'
        ) {
          return this.readMedicalRecord(transaction, current.id);
        }
        throw new ConflictException({
          code: 'RME_IDEMPOTENCY_CONFLICT',
          message: 'Kunci idempotensi telah dipakai oleh request finalisasi yang berbeda.',
        });
      }

      if (current.status === PrismaMedicalRecordStatus.FINAL) {
        throw new ConflictException({
          code: 'RME_ALREADY_FINAL',
          message: 'RME sudah final. Retry harus memakai kunci idempotensi request semula.',
          currentVersion: current.version,
        });
      }

      this.assertExpectedVersion(current.version, command.expectedVersion);
      const draft = await this.readFinalizationDraft(transaction, current.id);
      const preflight = validateFinalization(draft);
      if (!preflight.ready) {
        throw new BadRequestException({
          code: 'RME_PREFLIGHT_FAILED',
          message: `RME belum memenuhi validation profile ${preflight.validationProfile}.`,
          issues: preflight.issues,
        });
      }

      const now = new Date();
      const finalVersion = current.version + 1;
      const finalized = await transaction.medicalRecord.update({
        where: { id: current.id },
        data: {
          status: PrismaMedicalRecordStatus.FINAL,
          version: { increment: 1 },
          finalizedBy: actor.username,
          finalizedAt: now,
        },
        include: medicalRecordInclude,
      });
      await this.encounters.saveRmeCompletion(transaction, command.encounterId, encounter.version, actor);
      await transaction.medicalRecordAuditEvent.create({
        data: {
          medicalRecordId: current.id,
          actorUserId,
          actorUsername: actor.username,
          actorRole: actor.role,
          action: 'RME_FINALIZED',
          entityType: 'MedicalRecord',
          entityId: current.id,
          entityVersion: finalVersion,
          expectedVersion: command.expectedVersion,
          occurredAt: now,
          requestId: request.requestId,
          correlationId: request.correlationId,
          idempotencyKey: command.idempotencyKey,
        },
      });
      return finalized;
    });
    return this.toResponse(record);
  }

  private async toResponse(record: MedicalRecordWithRelations): Promise<MedicalRecord> {
    const conditionIntegrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Condition',
          record.diagnoses.map((diagnosis) => diagnosis.id),
        )
      : new Map();
    const observationIntegrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Observation',
          (record.observations ?? []).map(
            (observation) => observation.id,
          ),
        )
      : new Map();
    const catalogClient = this.prisma.masterIcd10;
    const codes = record.diagnoses.map((diagnosis) => diagnosis.icd10Code);
    const catalogEntries =
      catalogClient && typeof catalogClient.findMany === 'function'
        ? await catalogClient.findMany({ where: { code: { in: codes } } })
        : [];
    return toMedicalRecord(
      record,
      conditionIntegrations,
      new Map(catalogEntries.map((entry) => [entry.code, entry])),
      observationIntegrations,
    );
  }

  /**
   * Draft edits must keep a diagnosis UUID alive so a provider linkage remains
   * scoped to the same local clinical item. The fallback by ICD-10 code keeps
   * older clients compatible while newer clients echo the child id explicitly.
   */
  private async replaceDraftDiagnoses(
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
    const existingById = new Map(existing.map((diagnosis) => [diagnosis.id, diagnosis]));
    const existingByCode = new Map<string, (typeof existing)[number]>();
    for (const diagnosis of existing) {
      if (!existingByCode.has(diagnosis.icd10Code)) {
        existingByCode.set(diagnosis.icd10Code, diagnosis);
      }
    }
    const keptIds = new Set<string>();

    for (const diagnosis of diagnoses) {
      const matched =
        (diagnosis.id ? existingById.get(diagnosis.id) : undefined) ?? existingByCode.get(diagnosis.icd10Code);
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

    const removedIds = existing.map((diagnosis) => diagnosis.id).filter((id) => !keptIds.has(id));
    if (removedIds.length > 0) {
      await delegate.deleteMany({ where: { id: { in: removedIds } } });
    }
  }

  private async replaceDraftObservations(
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
    const existingById = new Map(existing.map((observation) => [observation.id, observation]));
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
      const data = this.observationData({
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

  private observationData(
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

  private async readMedicalRecordAfterChildReplacement(
    transaction: Prisma.TransactionClient,
    id: string,
    fallback: MedicalRecordWithRelations,
  ): Promise<MedicalRecordWithRelations> {
    if (
      !transaction.diagnosis &&
      !transaction.clinicalObservation
    ) {
      return fallback;
    }
    const refreshed = await transaction.medicalRecord.findUnique({
      where: { id },
      include: medicalRecordInclude,
    });
    return refreshed ?? fallback;
  }

  private async requireDraft(transaction: Prisma.TransactionClient, encounterId: string): Promise<LockedMedicalRecord> {
    const current = await this.lockMedicalRecord(transaction, encounterId);
    if (!current) {
      throw new ConflictException({
        code: 'RME_DRAFT_REQUIRED',
        message: 'Simpan draft RME sebelum melakukan finalisasi.',
      });
    }
    return current;
  }

  private async readFinalizationDraft(transaction: Prisma.TransactionClient, id: string) {
    const draft = await transaction.medicalRecord.findUnique({
      where: { id },
      include: finalizationInclude,
    });
    if (!draft) throw new NotFoundException('RME tidak ditemukan');
    return draft;
  }

  private async readMedicalRecord(
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

  private async lockEncounter(transaction: Prisma.TransactionClient, encounterId: string): Promise<LockedEncounter> {
    const rows = await transaction.$queryRaw<LockedEncounter[]>(
      Prisma.sql`SELECT "id", "status", "version", "doctorId", "organizationId", "locationId" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE`,
    );
    if (!rows[0]) throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    return rows[0];
  }

  private async lockMedicalRecord(
    transaction: Prisma.TransactionClient,
    encounterId: string,
  ): Promise<LockedMedicalRecord | null> {
    const rows = await transaction.$queryRaw<LockedMedicalRecord[]>(
      Prisma.sql`SELECT "id", "status", "version" FROM "MedicalRecord" WHERE "encounterId" = ${encounterId} FOR UPDATE`,
    );
    return rows[0] ?? null;
  }

  private assertEncounterInProgress(encounter: LockedEncounter): void {
    if (encounter.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'RME_ENCOUNTER_NOT_IN_PROGRESS',
        message: 'Encounter harus berstatus IN_PROGRESS untuk menulis RME.',
      });
    }
  }

  private assertDoctorAssignment(
    encounterDoctorId: string,
    actor: AuthenticatedUser,
    actorUserId: string | undefined,
  ): void {
    if (actor.role === 'DOKTER' && actorUserId !== encounterDoctorId) {
      throw new ForbiddenException({
        code: 'ENCOUNTER_NOT_ASSIGNED_TO_DOCTOR',
        message: 'Encounter ini ditugaskan kepada dokter lain.',
      });
    }
  }

  private async resolveActorUserId(actor: AuthenticatedUser): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { username: actor.username },
      select: { id: true },
    });
    return user?.id;
  }

  private assertExpectedVersion(current: number, expected: number): void {
    if (current !== expected) {
      throw new ConflictException({
        code: 'RME_VERSION_CONFLICT',
        message: 'RME sudah berubah. Muat ulang data sebelum mencoba lagi.',
        currentVersion: current,
      });
    }
  }
}
