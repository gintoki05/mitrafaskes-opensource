import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  Prisma,
  Role,
  LocationStatus,
  EncounterStatus as PrismaEncounterStatus,
} from '@prisma/client';
import { EncounterStatus, UserRole } from '@mitrafaskes/shared';
import type {
  Encounter as SharedEncounter,
  EncounterHistoryListQuery,
  EncounterListQuery,
} from '@mitrafaskes/shared';
import type { ResourceIntegrationSummary } from '@mitrafaskes/shared';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import { IntegrationRegistry } from '../integrations/integration-registry';
import {
  formatFacilityDate,
  parseFacilityDate,
  yearFromFacilityDate,
} from './encounter.constants';
import {
  EncounterConflictError,
  EncounterContextError,
  EncounterNotFoundError,
  EncounterTransitionError,
  EncounterValidationError,
} from './encounter.errors';
import { toEncounter } from './encounter.mapper';
import {
  EncounterRepository,
  encounterInclude,
  type EncounterWithRelations,
} from './encounter.repository';
import { assertEncounterTransition } from './encounter.status-policy';
import {
  validateCreateEncounter,
  validateEncounterHistoryDateRange,
  validateStatusUpdate,
  type ValidatedCreateEncounterInput,
  type ValidatedStatusInput,
} from './encounter.validation';

type EncounterActor = Pick<AuthenticatedUser, 'username' | 'role'> & {
  id?: string;
};

const mapStatusToPrisma = (status: EncounterStatus): PrismaEncounterStatus =>
  status;

const isUniqueError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class EncountersService {
  private readonly repository: EncounterRepository;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations?: IntegrationRegistry,
  ) {
    this.repository = new EncounterRepository(prisma);
  }

  async findMany(query: EncounterListQuery = {}, actor?: EncounterActor) {
    let queueDate: Date;
    try {
      queueDate = parseFacilityDate(
        query.queueDate ?? formatFacilityDate(new Date()),
      );
    } catch (error) {
      throw new EncounterValidationError(
        error instanceof Error ? error.message : 'Tanggal antrean tidak valid',
        [
          {
            field: 'queueDate',
            message: 'Tanggal antrean harus berformat YYYY-MM-DD',
          },
        ],
      );
    }
    const page = this.normalizePositiveInteger(query.page, 1);
    const pageSize = Math.min(
      this.normalizePositiveInteger(query.pageSize, 25),
      100,
    );
    const doctorId =
      actor?.role === UserRole.DOKTER
        ? await this.resolveActorUserId(actor)
        : undefined;
    const locationIds =
      actor?.role === UserRole.PERAWAT
        ? await this.resolveActorLocationIds(actor)
        : undefined;
    const { records, total, statusCounts } = await this.repository.findMany(
      {
        queueDate,
        locationId:
          actor?.role === UserRole.PERAWAT ? undefined : query.locationId,
        locationIds,
        doctorId:
          actor?.role === UserRole.DOKTER
            ? (doctorId ?? '__unknown_doctor__')
            : undefined,
        status: query.status ? mapStatusToPrisma(query.status) : undefined,
        statuses: query.statuses?.map(mapStatusToPrisma),
      },
      page,
      pageSize,
    );
    return this.toListResponse(records, page, pageSize, total, statusCounts);
  }

  async findHistory(
    query: EncounterHistoryListQuery = {},
    actor?: EncounterActor,
  ) {
    const { fromDate, toDate } = validateEncounterHistoryDateRange(
      query.fromDate,
      query.toDate,
    );
    const page = this.normalizePositiveInteger(query.page, 1);
    const pageSize = Math.min(
      this.normalizePositiveInteger(query.pageSize, 25),
      100,
    );
    const doctorId =
      actor?.role === UserRole.DOKTER
        ? await this.resolveActorUserId(actor)
        : undefined;
    const { records, total } = await this.repository.findHistory(
      {
        fromDate,
        toDate,
        search: query.search,
        status: query.status ? mapStatusToPrisma(query.status) : undefined,
        doctorId:
          actor?.role === UserRole.DOKTER
            ? (doctorId ?? '__unknown_doctor__')
            : undefined,
      },
      page,
      pageSize,
    );
    return this.toListResponse(records, page, pageSize, total);
  }

  async create(
    input: unknown,
    actor: EncounterActor,
  ): Promise<SharedEncounter> {
    const validated = validateCreateEncounter(input);
    const actorUserId = await this.resolveActorUserId(actor);
    const queueDateValue = formatFacilityDate(new Date());
    const queueDate = parseFacilityDate(queueDateValue);

    try {
      const record = await this.prisma.$transaction(async (transaction) => {
        const context = await this.readAndValidateContext(
          transaction,
          validated,
        );
        const duplicate = await transaction.encounter.findFirst({
          where: {
            patientId: validated.patientId,
            locationId: validated.locationId,
            queueDate,
            status: {
              in: [
                PrismaEncounterStatus.WAITING,
                PrismaEncounterStatus.IN_PROGRESS,
              ],
            },
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
                actorRole: actor.role,
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
    if (validated.status === ('COMPLETED' as EncounterStatus)) {
      throw new EncounterTransitionError(
        'Encounter hanya dapat diselesaikan melalui finalisasi RME.',
        'ENCOUNTER_COMPLETION_REQUIRES_RME_FINALIZATION',
      );
    }
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

  private async toListResponse(
    records: EncounterWithRelations[],
    page: number,
    pageSize: number,
    total: number,
    statusCounts?: Record<EncounterStatus, number>,
  ) {
    const integrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Encounter',
          records.map((record) => record.id),
        )
      : new Map<string, ResourceIntegrationSummary[]>();
    return {
      items: records.map((record) =>
        toEncounter(record, integrations.get(record.id) ?? []),
      ),
      meta: { page, pageSize, total },
      ...(statusCounts ? { statusCounts } : {}),
    };
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
      throw new EncounterContextError(
        'Pasien tidak ditemukan atau tidak aktif',
        'PATIENT_NOT_FOUND',
      );
    }
    if (!location) {
      throw new EncounterContextError(
        'Lokasi layanan tidak ditemukan',
        'LOCATION_NOT_FOUND',
      );
    }
    if (!location.active || location.status !== LocationStatus.ACTIVE) {
      throw new EncounterContextError(
        'Lokasi layanan tidak aktif',
        'LOCATION_INACTIVE',
      );
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
      throw new EncounterContextError(
        'Dokter tidak ditemukan atau tidak aktif',
        'PRACTITIONER_NOT_FOUND',
      );
    }
    const assignedToLocation = doctor.locationAssignments
      ? doctor.locationAssignments.some(
          (assignment) => assignment.locationId === location.id,
        )
      : doctor.locationId === location.id;
    if (
      doctor.organizationId !== location.organizationId ||
      !assignedToLocation
    ) {
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
      Array<{
        id: string;
        status: PrismaEncounterStatus;
        version: number;
        doctorId: string;
      }>
    >(
      Prisma.sql`SELECT "id", "status", "version", "doctorId" FROM "Encounter" WHERE "id" = ${id} FOR UPDATE`,
    );
    const current = locked[0];
    if (!current) throw new EncounterNotFoundError();
    if (actor.role === UserRole.DOKTER && actorUserId !== current.doctorId) {
      throw new ForbiddenException({
        code: 'ENCOUNTER_NOT_ASSIGNED_TO_DOCTOR',
        message: 'Encounter ini ditugaskan kepada dokter lain.',
      });
    }
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
    if (input.status === EncounterStatus.IN_PROGRESS) {
      lifecycleData.startedAt = now;
    }
    if (input.status === EncounterStatus.COMPLETED) {
      lifecycleData.completedAt = now;
    }
    if (input.status === EncounterStatus.CANCELLED) {
      lifecycleData.cancelledAt = now;
    }

    await transaction.encounter.update({ where: { id }, data: lifecycleData });
    await transaction.encounterStatusHistory.create({
      data: {
        encounterId: id,
        status: mapStatusToPrisma(input.status),
        periodStart: now,
        actorUserId,
        actorUsername: actor.username,
        actorRole: actor.role,
      },
    });
    const updated = await this.repository.findByIdInTransaction(
      transaction,
      id,
    );
    if (!updated) throw new EncounterNotFoundError();
    return updated;
  }

  private async resolveActorUserId(
    actor: EncounterActor,
  ): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { username: actor.username },
      select: { id: true },
    });
    return user?.id;
  }

  private async resolveActorLocationIds(
    actor: EncounterActor,
  ): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { username: actor.username },
      select: {
        locationId: true,
        locationAssignments: { select: { locationId: true } },
      },
    });
    const ids = [
      ...(user?.locationId ? [user.locationId] : []),
      ...(user?.locationAssignments ?? []).map(
        (assignment) => assignment.locationId,
      ),
    ];
    return [...new Set(ids)];
  }

  private normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
  ): number {
    return value !== undefined && Number.isInteger(value) && value > 0
      ? value
      : fallback;
  }
}
