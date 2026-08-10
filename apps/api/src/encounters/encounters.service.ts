import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Role,
  LocationStatus,
  EncounterStatus as PrismaEncounterStatus,
} from '@prisma/client';
import type {
  Encounter as SharedEncounter,
  EncounterListQuery,
  EncounterStatus,
  SatusehatEncounterPayload,
  SatusehatEncounterPreview,
} from '@mitrafaskes/shared';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import {
  formatFacilityDate,
  parseFacilityDate,
  yearFromFacilityDate,
} from './encounter.constants';
import {
  EncounterConflictError,
  EncounterContextError,
  EncounterNotFoundError,
  EncounterValidationError,
} from './encounter.errors';
import { toEncounter } from './encounter.mapper';
import {
  EncounterRepository,
  encounterInclude,
  type EncounterWithRelations,
} from './encounter.repository';
import { EncounterSyncStatusRepository } from './encounter-sync-status.repository';
import { assertEncounterTransition, toSatusehatEncounterStatus } from './encounter.status-policy';
import {
  validateCreateEncounter,
  validateStatusUpdate,
  type ValidatedCreateEncounterInput,
  type ValidatedStatusInput,
} from './encounter.validation';

type EncounterActor = Pick<AuthenticatedUser, 'username' | 'role'> & {
  id?: string;
};

const PATIENT_RESOURCE_TYPE = 'Patient';
const PRACTITIONER_RESOURCE_TYPE = 'Practitioner';
const LOCATION_RESOURCE_TYPE = 'Location';
const ORGANIZATION_RESOURCE_TYPE = 'Organization';

const mapStatusToPrisma = (status: EncounterStatus): PrismaEncounterStatus =>
  status as PrismaEncounterStatus;

const isUniqueError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

@Injectable()
export class EncountersService {
  private readonly repository: EncounterRepository;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncStatus: EncounterSyncStatusRepository,
  ) {
    this.repository = new EncounterRepository(prisma);
  }

  async findMany(query: EncounterListQuery = {}) {
    let queueDate: Date;
    try {
      queueDate = parseFacilityDate(
        query.queueDate ?? formatFacilityDate(new Date()),
      );
    } catch (error) {
      throw new EncounterValidationError(
        error instanceof Error ? error.message : 'Tanggal antrean tidak valid',
        [{ field: 'queueDate', message: 'Tanggal antrean harus berformat YYYY-MM-DD' }],
      );
    }
    const page = this.normalizePositiveInteger(query.page, 1);
    const pageSize = Math.min(this.normalizePositiveInteger(query.pageSize, 25), 100);
    const { records, total } = await this.repository.findMany(
      {
        queueDate,
        locationId: query.locationId,
        status: query.status ? mapStatusToPrisma(query.status) : undefined,
      },
      page,
      pageSize,
    );
    const statuses = await this.syncStatus.findForList(records.map((record) => record.id));
    return {
      items: records.map((record) =>
        toEncounter(record, {
          link: this.syncStatus.toLinkage(statuses.links.get(record.id)),
          log: this.syncStatus.toSyncSummary(statuses.logs.get(record.id)),
        }),
      ),
      meta: { page, pageSize, total },
    };
  }

  async create(input: unknown, actor: EncounterActor): Promise<SharedEncounter> {
    const validated = validateCreateEncounter(input);
    const actorUserId = await this.resolveActorUserId(actor);
    const queueDateValue = formatFacilityDate(new Date());
    const queueDate = parseFacilityDate(queueDateValue);

    try {
      const record = await this.prisma.$transaction(async (transaction) => {
        const context = await this.readAndValidateContext(transaction, validated);
        const duplicate = await transaction.encounter.findFirst({
          where: {
            patientId: validated.patientId,
            locationId: validated.locationId,
            queueDate,
            status: { in: [PrismaEncounterStatus.WAITING, PrismaEncounterStatus.IN_PROGRESS] },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new EncounterConflictError(
            'Pasien sudah memiliki antrean aktif pada lokasi dan tanggal tersebut',
            'ENCOUNTER_ACTIVE_DUPLICATE',
          );
        }

        const queueNumber = await this.repository.nextQueueNumber(
          transaction,
          validated.locationId,
          queueDate,
        );
        const encounterNumber = await this.repository.nextEncounterNumber(
          transaction,
          yearFromFacilityDate(queueDateValue),
        );
        const now = new Date();
        return transaction.encounter.create({
          data: {
            id: randomUUID(),
            encounterNumber,
            patient: { connect: { id: context.patient.id } },
            doctor: { connect: { id: context.doctor.id } },
            organization: { connect: { id: context.location.organizationId } },
            location: { connect: { id: context.location.id } },
            queueDate,
            queueNumber,
            status: PrismaEncounterStatus.WAITING,
            arrivedAt: now,
            statusHistory: {
              create: {
                status: PrismaEncounterStatus.WAITING,
                periodStart: now,
                actorUserId,
                actorUsername: actor.username,
                actorRole: actor.role as Role,
              },
            },
          },
          include: encounterInclude,
        });
      });
      return toEncounter(record);
    } catch (error) {
      if (error instanceof EncounterConflictError) throw error;
      if (isUniqueError(error)) {
        throw new EncounterConflictError(
          'Nomor antrean atau pasien aktif bertabrakan dengan pendaftaran lain',
          'ENCOUNTER_QUEUE_CONFLICT',
        );
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    input: unknown,
    actor: EncounterActor,
  ): Promise<SharedEncounter> {
    const validated = validateStatusUpdate(input);
    const actorUserId = await this.resolveActorUserId(actor);
    const record = await this.prisma.$transaction((transaction) =>
      this.transitionInTransaction(
        transaction,
        id,
        validated,
        actor,
        actorUserId,
      ),
    );
    return toEncounter(record);
  }

  async findById(id: string): Promise<EncounterWithRelations | null> {
    return this.repository.findById(id);
  }

  async saveRmeCompletion(
    transaction: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    actor: EncounterActor,
  ): Promise<EncounterWithRelations> {
    const actorUserId = await this.resolveActorUserId(actor);
    return this.transitionInTransaction(
      transaction,
      id,
      { status: 'COMPLETED' as EncounterStatus, expectedVersion },
      actor,
      actorUserId,
    );
  }

  async previewSatusehat(id: string): Promise<SatusehatEncounterPreview> {
    const record = await this.repository.findById(id);
    if (!record) throw new EncounterNotFoundError();

    const dependencies = await Promise.all([
      this.syncStatus.findDependencyLink(PATIENT_RESOURCE_TYPE, 'Patient', record.patientId),
      this.syncStatus.findDependencyLink(PRACTITIONER_RESOURCE_TYPE, 'User', record.doctorId),
      this.syncStatus.findDependencyLink(LOCATION_RESOURCE_TYPE, 'Location', record.locationId),
      this.syncStatus.findDependencyLink(
        ORGANIZATION_RESOURCE_TYPE,
        'HealthcareOrganization',
        record.organizationId,
      ),
    ]);
    const dependencyDefinitions = [
      ['Patient', record.patientId, dependencies[0]],
      ['Practitioner', record.doctorId, dependencies[1]],
      ['Location', record.locationId, dependencies[2]],
      ['Organization', record.organizationId, dependencies[3]],
    ] as const;
    const blockers = dependencyDefinitions
      .filter(([, , link]) => !link)
      .map(([resourceType, localResourceId]) => ({
        code: `${resourceType.toUpperCase()}_NOT_LINKED`,
        resourceType,
        localResourceId,
        message: `${resourceType} belum terhubung ke SATUSEHAT`,
      }));

    const result: SatusehatEncounterPreview = {
      encounterId: id,
      ready: blockers.length === 0,
      blockers,
    };
    if (blockers.length > 0) return result;

    const patientLink = dependencies[0]!;
    const practitionerLink = dependencies[1]!;
    const locationLink = dependencies[2]!;
    const organizationLink = dependencies[3]!;
    const payload: SatusehatEncounterPayload = {
      resourceType: 'Encounter',
      identifier: [
        {
          use: 'official',
          system: `http://sys-ids.kemkes.go.id/encounter/${organizationLink.externalResourceId}`,
          value: record.encounterNumber,
        },
      ],
      status: toSatusehatEncounterStatus(record.status as unknown as EncounterStatus),
      statusHistory: record.statusHistory.map((entry) => ({
        status: toSatusehatEncounterStatus(entry.status as unknown as EncounterStatus),
        period: {
          start: entry.periodStart.toISOString(),
          end: entry.periodEnd?.toISOString(),
        },
      })),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      subject: {
        reference: `Patient/${patientLink.externalResourceId}`,
        display: record.patient.fullName,
      },
      participant: [
        {
          type: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'ATND',
                  display: 'attender',
                },
              ],
            },
          ],
          individual: {
            reference: `Practitioner/${practitionerLink.externalResourceId}`,
            display: record.doctor.fullName,
          },
        },
      ],
      period: {
        start: record.arrivedAt.toISOString(),
        end: (record.completedAt ?? record.cancelledAt)?.toISOString(),
      },
      location: [
        {
          location: {
            reference: `Location/${locationLink.externalResourceId}`,
            display: record.location.name,
          },
        },
      ],
      serviceProvider: {
        reference: `Organization/${organizationLink.externalResourceId}`,
        display: record.organization.name,
      },
    };
    result.payload = payload;
    return result;
  }

  private async readAndValidateContext(
    transaction: Prisma.TransactionClient,
    input: ValidatedCreateEncounterInput,
  ) {
    const [patient, location, doctor] = await Promise.all([
      transaction.patient.findUnique({ where: { id: input.patientId } }),
      transaction.location.findUnique({
        where: { id: input.locationId },
        include: { organization: { select: { id: true, active: true } } },
      }),
      transaction.user.findUnique({
        where: { id: input.doctorId },
        include: { locationAssignments: { select: { locationId: true } } },
      }),
    ]);
    if (!patient || !patient.active) {
      throw new EncounterContextError('Pasien tidak ditemukan atau tidak aktif', 'PATIENT_NOT_FOUND');
    }
    if (!location) {
      throw new EncounterContextError('Lokasi layanan tidak ditemukan', 'LOCATION_NOT_FOUND');
    }
    if (!location.active || location.status !== LocationStatus.ACTIVE) {
      throw new EncounterContextError('Lokasi layanan tidak aktif', 'LOCATION_INACTIVE');
    }
    if (!location.organization) {
      throw new EncounterContextError(
        'Organization lokasi layanan tidak ditemukan',
        'ORGANIZATION_NOT_FOUND',
      );
    }
    if (!location.organization.active) {
      throw new EncounterContextError(
        'Organization lokasi layanan tidak aktif',
        'ORGANIZATION_INACTIVE',
      );
    }
    if (!doctor || !doctor.active || doctor.role !== Role.DOKTER) {
      throw new EncounterContextError('Dokter tidak ditemukan atau tidak aktif', 'PRACTITIONER_NOT_FOUND');
    }
    const assignedToLocation = doctor.locationAssignments
      ? doctor.locationAssignments.some(
          (assignment) => assignment.locationId === location.id,
        )
      : doctor.locationId === location.id;
    if (doctor.organizationId !== location.organizationId || !assignedToLocation) {
      throw new EncounterContextError(
        'Dokter belum ditugaskan ke lokasi layanan yang dipilih',
        'PRACTITIONER_NOT_ASSIGNED_TO_LOCATION',
      );
    }
    return { patient, location, doctor };
  }

  private async transitionInTransaction(
    transaction: Prisma.TransactionClient,
    id: string,
    input: ValidatedStatusInput,
    actor: EncounterActor,
    actorUserId: string | undefined,
  ): Promise<EncounterWithRelations> {
    const locked = await transaction.$queryRaw<
      Array<{ id: string; status: PrismaEncounterStatus; version: number }>
    >(
      Prisma.sql`SELECT "id", "status", "version" FROM "Encounter" WHERE "id" = ${id} FOR UPDATE`,
    );
    const current = locked[0];
    if (!current) throw new EncounterNotFoundError();
    if (input.expectedVersion !== current.version) {
      throw new EncounterConflictError(
        'Encounter sudah berubah. Muat ulang data sebelum mencoba lagi.',
        'ENCOUNTER_VERSION_CONFLICT',
      );
    }

    const currentStatus = current.status as unknown as EncounterStatus;
    assertEncounterTransition(currentStatus, input.status);
    const now = new Date();
    const latestHistory = await transaction.encounterStatusHistory.findFirst({
      where: { encounterId: id },
      orderBy: { periodStart: 'desc' },
    });
    if (latestHistory) {
      await transaction.encounterStatusHistory.update({
        where: { id: latestHistory.id },
        data: { periodEnd: now },
      });
    }

    const lifecycleData: Prisma.EncounterUpdateInput = {
      status: mapStatusToPrisma(input.status),
      version: { increment: 1 },
    };
    if (input.status === 'IN_PROGRESS') lifecycleData.startedAt = now;
    if (input.status === 'COMPLETED') lifecycleData.completedAt = now;
    if (input.status === 'CANCELLED') lifecycleData.cancelledAt = now;

    await transaction.encounter.update({ where: { id }, data: lifecycleData });
    await transaction.encounterStatusHistory.create({
      data: {
        encounterId: id,
        status: mapStatusToPrisma(input.status),
        periodStart: now,
        actorUserId,
        actorUsername: actor.username,
        actorRole: actor.role as Role,
      },
    });
    const updated = await this.repository.findByIdInTransaction(transaction, id);
    if (!updated) throw new EncounterNotFoundError();
    return updated;
  }

  private async resolveActorUserId(actor: EncounterActor): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { username: actor.username },
      select: { id: true },
    });
    return user?.id;
  }

  private normalizePositiveInteger(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isInteger(value) && value > 0
      ? value
      : fallback;
  }
}
