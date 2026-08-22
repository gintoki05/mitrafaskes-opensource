import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TriageStatus as PrismaTriageStatus } from '@prisma/client';
import {
  EncounterStatus,
  UserRole,
  type MedicalRecord,
} from '@mitrafaskes/shared';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import {
  medicalRecordInclude,
  toMedicalRecord,
  type MedicalRecordWithRelations,
} from './rme.mapper';
import {
  assertExpectedVersion,
  lockEncounter,
  lockMedicalRecord,
  readMedicalRecordAfterChildReplacement,
  replaceDraftHistories,
  replaceDraftObservations,
  resolveActorUserId,
} from './rme.persistence';
import {
  parseCompleteTriageInput,
  parseTriageDraftInput,
} from './rme.validation';
import { buildObservationDrafts, projectLegacyVitals } from './rme.observation';
import { validateTriageCompletion } from './triage.validation';

export type TriageRequestMetadata = {
  requestId: string;
  correlationId: string;
};

export function isTriageEditable(
  encounterStatus: EncounterStatus,
  triageStatus?: string,
): boolean {
  return (
    encounterStatus === EncounterStatus.ARRIVED ||
    (encounterStatus === EncounterStatus.IN_PROGRESS &&
      triageStatus !== 'COMPLETED')
  );
}

@Injectable()
export class TriageService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEncounterId(
    encounterId: string,
    actor: AuthenticatedUser,
  ): Promise<MedicalRecord | null> {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { organizationId: true, locationId: true },
    });
    if (!encounter)
      throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    await this.assertNurseScope(
      this.prisma,
      actor,
      encounter.organizationId,
      encounter.locationId,
    );
    const record = await this.prisma.medicalRecord.findUnique({
      where: { encounterId },
      include: medicalRecordInclude,
    });
    return record ? this.mapTriageRecord(record) : null;
  }

  async saveDraft(
    input: unknown,
    actor: AuthenticatedUser,
    metadata: TriageRequestMetadata,
  ): Promise<MedicalRecord> {
    const draft = parseTriageDraftInput(input);
    const actorUserId = await resolveActorUserId(this.prisma, actor);
    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await lockEncounter(transaction, draft.encounterId);
      await this.assertNurseScope(
        transaction,
        actor,
        encounter.organizationId,
        encounter.locationId,
      );
      const locked = await lockMedicalRecord(transaction, draft.encounterId);
      this.assertTriageEditable(encounter.status, locked?.triageStatus);
      if (locked?.status === 'FINAL') {
        throw new ConflictException({
          code: 'RME_FINAL_IMMUTABLE',
          message: 'RME yang sudah final tidak dapat diubah melalui triase.',
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
        anamnesis: draft.anamnesis ?? null,
        systolic: projectedVitals.systolic ?? draft.systolic ?? null,
        diastolic: projectedVitals.diastolic ?? draft.diastolic ?? null,
        heartRate: projectedVitals.heartRate ?? draft.heartRate ?? null,
        temperature: projectedVitals.temperature ?? draft.temperature ?? null,
        weight: projectedVitals.weight ?? draft.weight ?? null,
        height: projectedVitals.height ?? draft.height ?? null,
        triageStatus: PrismaTriageStatus.DRAFT,
        triageUpdatedBy: actor.username,
        triageUpdatedAt: now,
        triageCompletedBy: null,
        triageCompletedAt: null,
      };

      let saved: MedicalRecordWithRelations;
      if (!locked) {
        const created = await transaction.medicalRecord.create({
          data: {
            encounterId: draft.encounterId,
            ...clinicalData,
            status: 'DRAFT',
            version: 1,
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
          data: { ...clinicalData, version: { increment: 1 } },
          include: medicalRecordInclude,
        });
        await replaceDraftHistories(transaction, locked.id, draft.histories);
        await replaceDraftObservations(transaction, locked.id, observations);
        saved = await readMedicalRecordAfterChildReplacement(
          transaction,
          locked.id,
          updated,
        );
      }
      await this.writeAudit(transaction, {
        medicalRecordId: saved.id,
        actor,
        actorUserId,
        action:
          locked?.triageStatus === PrismaTriageStatus.COMPLETED
            ? 'RME_TRIAGE_REOPENED'
            : 'RME_TRIAGE_DRAFT_SAVED',
        entityVersion: saved.version,
        expectedVersion: draft.expectedVersion,
        metadata,
      });
      return saved;
    });
    return this.mapTriageRecord(record);
  }

  async complete(
    input: unknown,
    actor: AuthenticatedUser,
    metadata: TriageRequestMetadata,
  ): Promise<MedicalRecord> {
    const command = parseCompleteTriageInput(input);
    const actorUserId = await resolveActorUserId(this.prisma, actor);
    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await lockEncounter(transaction, command.encounterId);
      await this.assertNurseScope(
        transaction,
        actor,
        encounter.organizationId,
        encounter.locationId,
      );
      const locked = await lockMedicalRecord(transaction, command.encounterId);
      this.assertTriageEditable(encounter.status, locked?.triageStatus);
      if (!locked) {
        throw new ConflictException({
          code: 'RME_TRIAGE_DRAFT_REQUIRED',
          message: 'Simpan draft triase sebelum menandai triase selesai.',
        });
      }
      const existingAudit =
        await transaction.medicalRecordAuditEvent.findUnique({
          where: { idempotencyKey: command.idempotencyKey },
        });
      if (existingAudit) {
        const isSameCompletion =
          existingAudit.action === 'RME_TRIAGE_COMPLETED' &&
          existingAudit.medicalRecordId === locked.id &&
          existingAudit.expectedVersion === command.expectedVersion &&
          existingAudit.entityVersion === locked.version &&
          locked.triageStatus === PrismaTriageStatus.COMPLETED;
        if (!isSameCompletion) {
          throw new ConflictException({
            code: 'RME_IDEMPOTENCY_CONFLICT',
            message:
              'Kunci idempotensi telah dipakai oleh request triase yang berbeda.',
          });
        }
        const existing = await transaction.medicalRecord.findUnique({
          where: { id: existingAudit.medicalRecordId },
          include: medicalRecordInclude,
        });
        if (!existing) throw new NotFoundException('RME tidak ditemukan');
        return existing;
      }
      assertExpectedVersion(locked.version, command.expectedVersion);
      const current = await transaction.medicalRecord.findUnique({
        where: { id: locked.id },
        include: medicalRecordInclude,
      });
      if (!current) throw new NotFoundException('RME tidak ditemukan');
      const issues = validateTriageCompletion(current);
      if (issues.length > 0) {
        throw new BadRequestException({
          code: 'RME_TRIAGE_VALIDATION_FAILED',
          message: 'Triase belum memenuhi data minimum.',
          issues,
        });
      }
      const now = new Date();
      const updated = await transaction.medicalRecord.update({
        where: { id: locked.id },
        data: {
          triageStatus: PrismaTriageStatus.COMPLETED,
          triageCompletedBy: actor.username,
          triageCompletedAt: now,
          triageUpdatedBy: actor.username,
          triageUpdatedAt: now,
          version: { increment: 1 },
        },
        include: medicalRecordInclude,
      });
      await this.writeAudit(transaction, {
        medicalRecordId: updated.id,
        actor,
        actorUserId,
        action: 'RME_TRIAGE_COMPLETED',
        entityVersion: updated.version,
        expectedVersion: command.expectedVersion,
        metadata,
        idempotencyKey: command.idempotencyKey,
      });
      return updated;
    });
    return this.mapTriageRecord(record);
  }

  private async mapTriageRecord(
    record: MedicalRecordWithRelations,
  ): Promise<MedicalRecord> {
    const mapped = toMedicalRecord(record);
    const completedBy = mapped.triageCompletedBy
      ? await this.prisma.user.findUnique({
          where: { username: mapped.triageCompletedBy },
          select: { fullName: true },
        })
      : null;
    return toTriageRecord(mapped, completedBy?.fullName);
  }

  private assertTriageEditable(
    encounterStatus: EncounterStatus,
    triageStatus?: string,
  ): void {
    if (!isTriageEditable(encounterStatus, triageStatus)) {
      throw new ConflictException({
        code: 'RME_TRIAGE_NOT_EDITABLE',
        message:
          'Triase hanya dapat diisi saat antrean menunggu atau dilanjutkan bila pemeriksaan sudah dimulai tetapi triase belum selesai.',
      });
    }
  }

  private async assertNurseScope(
    client: Pick<PrismaService, 'user'> | Prisma.TransactionClient,
    actor: AuthenticatedUser,
    organizationId: string,
    locationId: string,
  ): Promise<void> {
    if (actor.role !== UserRole.PERAWAT) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Akses triase hanya untuk perawat klinis.',
      });
    }
    const user = await client.user.findUnique({
      where: { username: actor.username },
      select: {
        role: true,
        organizationId: true,
        locationId: true,
        locationAssignments: { select: { locationId: true } },
      },
    });
    if (
      !user ||
      user.role !== 'PERAWAT' ||
      user.organizationId !== organizationId
    ) {
      throw new ForbiddenException({
        code: 'TRIAGE_SCOPE_FORBIDDEN',
        message: 'Perawat tidak ditugaskan pada faskes ini.',
      });
    }
    const locations = new Set([
      ...(user.locationId ? [user.locationId] : []),
      ...user.locationAssignments.map((assignment) => assignment.locationId),
    ]);
    if (!locations.has(locationId)) {
      throw new ForbiddenException({
        code: 'TRIAGE_SCOPE_FORBIDDEN',
        message: 'Perawat tidak ditugaskan pada lokasi ini.',
      });
    }
  }

  private async writeAudit(
    transaction: Prisma.TransactionClient,
    input: {
      medicalRecordId: string;
      actor: AuthenticatedUser;
      actorUserId?: string;
      action: string;
      entityVersion: number;
      expectedVersion: number;
      metadata: TriageRequestMetadata;
      idempotencyKey?: string;
    },
  ): Promise<void> {
    await transaction.medicalRecordAuditEvent.create({
      data: {
        medicalRecordId: input.medicalRecordId,
        actorUserId: input.actorUserId,
        actorUsername: input.actor.username,
        actorRole: input.actor.role,
        action: input.action,
        entityType: 'MedicalRecord',
        entityId: input.medicalRecordId,
        entityVersion: input.entityVersion,
        expectedVersion: input.expectedVersion,
        requestId: input.metadata.requestId,
        correlationId: input.metadata.correlationId,
        idempotencyKey:
          input.idempotencyKey ?? `${input.action}:${input.metadata.requestId}`,
      },
    });
  }
}

/** Keep the nurse surface limited to triage data; doctor-only RME sections stay server-side. */
function toTriageRecord(
  mapped: MedicalRecord,
  triageCompletedByName?: string,
): MedicalRecord {
  return {
    id: mapped.id,
    encounterId: mapped.encounterId,
    status: mapped.status,
    version: mapped.version,
    serviceProfile: mapped.serviceProfile,
    validationProfile: mapped.validationProfile,
    triageStatus: mapped.triageStatus,
    triageUpdatedBy: mapped.triageUpdatedBy,
    triageUpdatedAt: mapped.triageUpdatedAt,
    triageCompletedBy: mapped.triageCompletedBy,
    triageCompletedByName,
    triageCompletedAt: mapped.triageCompletedAt,
    chiefComplaint: mapped.chiefComplaint,
    presentIllness: mapped.presentIllness,
    allergyReviewStatus: mapped.allergyReviewStatus,
    allergyDetails: mapped.allergyDetails,
    anamnesis: mapped.anamnesis,
    histories: mapped.histories,
    systolic: mapped.systolic,
    diastolic: mapped.diastolic,
    heartRate: mapped.heartRate,
    temperature: mapped.temperature,
    weight: mapped.weight,
    height: mapped.height,
    observations: mapped.observations,
    diagnoses: [],
    prescriptions: [],
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  };
}
