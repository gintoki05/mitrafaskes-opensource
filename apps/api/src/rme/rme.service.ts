import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MedicalRecordStatus as PrismaMedicalRecordStatus } from '@prisma/client';
import {
  EncounterStatus,
  UserRole,
  type MedicalRecord,
  type RmeAuditItem,
  type ResourceIntegrationSummary,
  type RmePreflightResult,
} from '@mitrafaskes/shared';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { IntegrationRegistry } from '../integrations/integration-registry';
import { validateFinalization } from './rme.finalization-profile';
import {
  medicalRecordInclude,
  toMedicalRecord,
  type MedicalRecordWithRelations,
} from './rme.mapper';
import { buildObservationDrafts, projectLegacyVitals } from './rme.observation';
import {
  assertDoctorAssignment,
  assertEncounterInProgress,
  assertExpectedVersion,
  lockEncounter,
  lockMedicalRecord,
  readFinalizationDraft,
  readMedicalRecord,
  readMedicalRecordAfterChildReplacement,
  replaceDraftDiagnoses,
  replaceDraftHistories,
  replaceDraftObservations,
  requireDraft,
  resolveActorUserId,
} from './rme.persistence';
import {
  parseDraftInput,
  parseFinalizeInput,
  parsePreflightInput,
} from './rme.validation';

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

  async findByEncounterId(
    encounterId: string,
    actor: AuthenticatedUser,
  ): Promise<MedicalRecord | null> {
    const actorUserId = await resolveActorUserId(this.prisma, actor);
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { doctorId: true },
    });
    if (!encounter) {
      throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    }
    assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
    const record = await this.prisma.medicalRecord.findUnique({
      where: { encounterId },
      include: medicalRecordInclude,
    });
    return record ? this.toResponse(record) : null;
  }

  async auditByEncounterId(
    encounterId: string,
    actor: AuthenticatedUser,
  ): Promise<RmeAuditItem[]> {
    const actorUserId = await resolveActorUserId(this.prisma, actor);
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { doctorId: true },
    });
    if (!encounter) {
      throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    }
    assertDoctorAssignment(encounter.doctorId, actor, actorUserId);

    const record = await this.prisma.medicalRecord.findUnique({
      where: { encounterId },
      select: { id: true },
    });
    if (!record) return [];

    const events = await this.prisma.medicalRecordAuditEvent.findMany({
      where: { medicalRecordId: record.id },
      orderBy: [{ occurredAt: 'desc' }, { entityVersion: 'desc' }],
      take: 50,
      select: {
        id: true,
        action: true,
        actorUsername: true,
        actorRole: true,
        entityVersion: true,
        occurredAt: true,
      },
    });

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      actorUsername: event.actorUsername,
      actorRole: String(event.actorRole),
      revision: event.entityVersion,
      occurredAt: event.occurredAt.toISOString(),
    }));
  }

  async saveDraft(
    input: unknown,
    actor: AuthenticatedUser,
    request: RmeRequestMetadata = {
      requestId: randomUUID(),
      correlationId: randomUUID(),
    },
  ): Promise<MedicalRecord> {
    const draft = parseDraftInput(input);
    const actorUserId = await resolveActorUserId(this.prisma, actor);

    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await lockEncounter(transaction, draft.encounterId);
      assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      assertEncounterInProgress(encounter);
      const locked = await lockMedicalRecord(transaction, draft.encounterId);
      if (locked?.status === PrismaMedicalRecordStatus.FINAL) {
        throw new ConflictException({
          code: 'RME_FINAL_IMMUTABLE',
          message:
            'RME yang sudah final tidak dapat diubah melalui simpan draft.',
        });
      }
      assertExpectedVersion(locked?.version ?? 0, draft.expectedVersion);

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
        ...(locked?.triageStatus === 'COMPLETED' &&
        actor.role === UserRole.DOKTER
          ? { triageUpdatedBy: actor.username, triageUpdatedAt: now }
          : {}),
      };

      const correctingCompletedTriage =
        locked?.triageStatus === 'COMPLETED' && actor.role === UserRole.DOKTER;
      let saved: MedicalRecordWithRelations;
      if (!locked) {
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
        await replaceDraftObservations(transaction, created.id, observations);
        await replaceDraftHistories(transaction, created.id, draft.histories);
        saved = await readMedicalRecordAfterChildReplacement(
          transaction,
          created.id,
          created,
        );
      } else {
        const updated = await transaction.medicalRecord.update({
          where: { id: locked.id },
          data: {
            ...clinicalData,
            version: { increment: 1 },
            prescriptions: { deleteMany: {}, create: draft.prescriptions },
          },
          include: medicalRecordInclude,
        });
        await replaceDraftDiagnoses(transaction, locked.id, draft.diagnoses);
        await replaceDraftHistories(transaction, locked.id, draft.histories);
        await replaceDraftObservations(transaction, locked.id, observations);
        saved = await readMedicalRecordAfterChildReplacement(
          transaction,
          locked.id,
          updated,
        );
      }

      if (transaction.medicalRecordAuditEvent) {
        await transaction.medicalRecordAuditEvent.create({
          data: {
            medicalRecordId: saved.id,
            actorUserId,
            actorUsername: actor.username,
            actorRole: actor.role,
            action: correctingCompletedTriage
              ? 'RME_TRIAGE_CORRECTED_BY_DOCTOR'
              : 'RME_DRAFT_SAVED',
            entityType: 'MedicalRecord',
            entityId: saved.id,
            entityVersion: saved.version,
            expectedVersion: draft.expectedVersion,
            requestId: request.requestId,
            correlationId: request.correlationId,
            idempotencyKey: `${correctingCompletedTriage ? 'RME_TRIAGE_CORRECTED_BY_DOCTOR' : 'RME_DRAFT_SAVED'}:${saved.id}:${saved.version}`,
          },
        });
      }
      return saved;
    });
    return this.toResponse(record);
  }

  async preflight(
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<RmePreflightResult> {
    const command = parsePreflightInput(input);
    const actorUserId = await resolveActorUserId(this.prisma, actor);
    return this.prisma.$transaction(async (transaction) => {
      const encounter = await lockEncounter(transaction, command.encounterId);
      assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      const current = await requireDraft(transaction, command.encounterId);
      if (current.status === PrismaMedicalRecordStatus.FINAL) {
        throw new ConflictException({
          code: 'RME_ALREADY_FINAL',
          message:
            'RME sudah final. Muat ulang catatan untuk melihat versi terbaru.',
        });
      }
      assertExpectedVersion(current.version, command.expectedVersion);
      const draft = await readFinalizationDraft(transaction, current.id);
      return validateFinalization(draft);
    });
  }

  async finalize(
    input: unknown,
    actor: AuthenticatedUser,
    request: RmeRequestMetadata,
  ): Promise<MedicalRecord> {
    const command = parseFinalizeInput(input);
    const actorUserId = await resolveActorUserId(this.prisma, actor);
    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await lockEncounter(transaction, command.encounterId);
      assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      const current = await requireDraft(transaction, command.encounterId);
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
          encounter.status === EncounterStatus.FINISHED
        ) {
          return readMedicalRecord(transaction, current.id);
        }
        throw new ConflictException({
          code: 'RME_IDEMPOTENCY_CONFLICT',
          message:
            'Kunci idempotensi telah dipakai oleh request finalisasi yang berbeda.',
        });
      }

      if (current.status === PrismaMedicalRecordStatus.FINAL) {
        throw new ConflictException({
          code: 'RME_ALREADY_FINAL',
          message:
            'RME sudah final. Retry harus memakai kunci idempotensi request semula.',
          currentVersion: current.version,
        });
      }

      assertExpectedVersion(current.version, command.expectedVersion);
      const draft = await readFinalizationDraft(transaction, current.id);
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
      await this.encounters.saveRmeCompletion(
        transaction,
        command.encounterId,
        encounter.version,
        actor,
      );
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

  private async toResponse(
    record: MedicalRecordWithRelations,
  ): Promise<MedicalRecord> {
    const conditionIntegrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Condition',
          record.diagnoses.map((diagnosis) => diagnosis.id),
        )
      : new Map<string, ResourceIntegrationSummary[]>();
    const observationIntegrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Observation',
          (record.observations ?? []).map((observation) => observation.id),
        )
      : new Map<string, ResourceIntegrationSummary[]>();
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
}
