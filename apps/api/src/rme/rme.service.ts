import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MedicalRecordStatus as PrismaMedicalRecordStatus,
  Prisma,
} from '@prisma/client';
import {
  MEDICAL_RECORD_VALIDATION_PROFILE,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
  type MedicalRecord,
} from '@mitrafaskes/shared';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { MasterIcd10Service } from '../master-data/master-icd10.service';
import {
  assertReadyForFinalization,
  parseDraftInput,
  parseFinalizeInput,
  type ValidatedMedicalRecordDraft,
} from './rme.validation';

const medicalRecordInclude = {
  diagnoses: { include: { icd10: true } },
  prescriptions: true,
} satisfies Prisma.MedicalRecordInclude;

type MedicalRecordWithRelations = Prisma.MedicalRecordGetPayload<{
  include: typeof medicalRecordInclude;
}>;

type LockedEncounter = {
  id: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  version: number;
  doctorId: string;
};

type LockedMedicalRecord = {
  id: string;
  status: PrismaMedicalRecordStatus;
  version: number;
};

function toMedicalRecord(record: MedicalRecordWithRelations): MedicalRecord {
  if (
    record.serviceProfile !== MedicalRecordServiceProfile.OUTPATIENT_GENERAL ||
    record.validationProfile !==
      MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL]
  ) {
    throw new Error('Konfigurasi profil layanan RME tidak konsisten');
  }
  return {
    id: record.id,
    encounterId: record.encounterId,
    status: record.status as MedicalRecordStatus,
    version: record.version,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    authoredBy: record.authoredBy ?? undefined,
    authoredAt: record.authoredAt?.toISOString(),
    finalizedBy: record.finalizedBy ?? undefined,
    finalizedAt: record.finalizedAt?.toISOString(),
    validationProfile:
      MEDICAL_RECORD_VALIDATION_PROFILE[MedicalRecordServiceProfile.OUTPATIENT_GENERAL],
    anamnesis: record.anamnesis ?? undefined,
    systolic: record.systolic ?? undefined,
    diastolic: record.diastolic ?? undefined,
    heartRate: record.heartRate ?? undefined,
    temperature: record.temperature ?? undefined,
    weight: record.weight ?? undefined,
    height: record.height ?? undefined,
    diagnoses: record.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      icd10Code: diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
      icd10: diagnosis.icd10
        ? {
            code: diagnosis.icd10.code,
            display: diagnosis.icd10.display,
            nameIndo: diagnosis.icd10.nameIndo ?? undefined,
            nameEng: diagnosis.icd10.nameEng,
          }
        : undefined,
    })),
    prescriptions: record.prescriptions.map((prescription) => ({
      id: prescription.id,
      medicineName: prescription.medicineName,
      kfaCode: prescription.kfaCode ?? undefined,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      quantity: prescription.quantity,
      instructions: prescription.instructions ?? undefined,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class RmeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly icd10: MasterIcd10Service,
    private readonly encounters: EncountersService,
  ) {}

  async findByEncounterId(
    encounterId: string,
    actor: AuthenticatedUser,
  ): Promise<MedicalRecord | null> {
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
    return record ? toMedicalRecord(record) : null;
  }

  async saveDraft(
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<MedicalRecord> {
    const draft = parseDraftInput(input);
    await this.assertIcd10CodesExist(draft);
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
      const clinicalData = {
        anamnesis: draft.anamnesis ?? null,
        systolic: draft.systolic ?? null,
        diastolic: draft.diastolic ?? null,
        heartRate: draft.heartRate ?? null,
        temperature: draft.temperature ?? null,
        weight: draft.weight ?? null,
        height: draft.height ?? null,
        authoredBy: actor.username,
        authoredAt: now,
        serviceProfile: draft.serviceProfile,
        validationProfile: draft.validationProfile,
      };
      if (!current) {
        return transaction.medicalRecord.create({
          data: {
            encounterId: draft.encounterId,
            ...clinicalData,
            status: PrismaMedicalRecordStatus.DRAFT,
            version: 1,
            diagnoses: { create: draft.diagnoses },
            prescriptions: { create: draft.prescriptions },
          },
          include: medicalRecordInclude,
        });
      }

      return transaction.medicalRecord.update({
        where: { id: current.id },
        data: {
          ...clinicalData,
          version: { increment: 1 },
          diagnoses: { deleteMany: {}, create: draft.diagnoses },
          prescriptions: { deleteMany: {}, create: draft.prescriptions },
        },
        include: medicalRecordInclude,
      });
    });
    return toMedicalRecord(record);
  }

  async finalize(
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<MedicalRecord> {
    const command = parseFinalizeInput(input);
    const actorUserId = await this.resolveActorUserId(actor);
    const record = await this.prisma.$transaction(async (transaction) => {
      const encounter = await this.lockEncounter(transaction, command.encounterId);
      this.assertDoctorAssignment(encounter.doctorId, actor, actorUserId);
      const current = await this.lockMedicalRecord(transaction, command.encounterId);
      if (!current) {
        throw new ConflictException({
          code: 'RME_DRAFT_REQUIRED',
          message: 'Simpan draft RME sebelum melakukan finalisasi.',
        });
      }

      if (current.status === PrismaMedicalRecordStatus.FINAL) {
        if (
          encounter.status === 'COMPLETED' &&
          (command.expectedVersion === current.version ||
            command.expectedVersion === current.version - 1)
        ) {
          const finalized = await transaction.medicalRecord.findUnique({
            where: { id: current.id },
            include: medicalRecordInclude,
          });
          if (!finalized) throw new NotFoundException('RME tidak ditemukan');
          return finalized;
        }
        throw new ConflictException({
          code: 'RME_ALREADY_FINAL',
          message: 'RME sudah final. Muat ulang catatan untuk melihat versi terbaru.',
        });
      }

      this.assertEncounterInProgress(encounter);
      this.assertExpectedVersion(current.version, command.expectedVersion);
      const draft = await transaction.medicalRecord.findUnique({
        where: { id: current.id },
        include: {
          ...medicalRecordInclude,
          encounter: {
            select: {
              patientId: true,
              doctorId: true,
              organizationId: true,
              locationId: true,
            },
          },
        },
      });
      if (!draft) throw new NotFoundException('RME tidak ditemukan');
      assertReadyForFinalization(draft);

      const now = new Date();
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
      return finalized;
    });
    return toMedicalRecord(record);
  }

  private async assertIcd10CodesExist(
    draft: ValidatedMedicalRecordDraft,
  ): Promise<void> {
    const codes = draft.diagnoses.map((diagnosis) => diagnosis.icd10Code);
    const entries = await this.icd10.findByCodes(codes);
    const found = new Set(entries.map((entry) => entry.code));
    const missing = codes.filter((code) => !found.has(code));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'RME_ICD10_NOT_FOUND',
        message: 'Kode ICD-10 tidak ditemukan di katalog lokal.',
        codes: missing,
      });
    }
  }

  private async lockEncounter(
    transaction: Prisma.TransactionClient,
    encounterId: string,
  ): Promise<LockedEncounter> {
    const rows = await transaction.$queryRaw<LockedEncounter[]>(
      Prisma.sql`SELECT "id", "status", "version", "doctorId" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE`,
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

  private async resolveActorUserId(
    actor: AuthenticatedUser,
  ): Promise<string | undefined> {
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
