import {
  Prisma,
  EncounterStatus as PrismaEncounterStatus,
  TriageStatus as PrismaTriageStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  ACTIVE_ENCOUNTER_STATUSES,
  type EncounterStatusCounts,
} from '@mitrafaskes/shared';
import {
  fromPrismaEncounterStatus,
  toPrismaEncounterStatus,
} from './encounter.status-map';
import { PrismaService } from '../database/prisma.service';

export const encounterInclude = {
  patient: {
    select: {
      id: true,
      nik: true,
      fullName: true,
      medicalRecNo: true,
      birthDate: true,
      gender: true,
      address: true,
      phone: true,
      birthPlaceText: true,
    },
  },
  doctor: {
    select: {
      id: true,
      fullName: true,
      sipNumber: true,
    },
  },
  organization: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  location: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  statusHistory: {
    orderBy: { periodStart: 'asc' as const },
  },
  medicalRecord: {
    select: {
      triageStatus: true,
      triageUpdatedAt: true,
      triageCompletedAt: true,
      triageCompletedBy: true,
    },
  },
} satisfies Prisma.EncounterInclude;

export type EncounterWithRelations = Prisma.EncounterGetPayload<{
  include: typeof encounterInclude;
}>;

export interface EncounterListWhere {
  queueDate: Date;
  includeActiveAcrossDates?: boolean;
  locationId?: string;
  locationIds?: string[];
  doctorId?: string;
  status?: Prisma.EncounterWhereInput['status'];
  statuses?: PrismaEncounterStatus[];
  triageStatuses?: PrismaTriageStatus[];
}

export interface EncounterHistoryListWhere {
  fromDate: Date;
  toDate: Date;
  doctorId?: string;
  search?: string;
  status?: Prisma.EncounterWhereInput['status'];
}

export class EncounterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: EncounterListWhere,
    page: number,
    pageSize: number,
  ): Promise<{
    records: EncounterWithRelations[];
    total: number;
    statusCounts: EncounterStatusCounts;
  }> {
    const activePrismaStatuses = ACTIVE_ENCOUNTER_STATUSES.map(
      toPrismaEncounterStatus,
    );
    const scopeWhere: Prisma.EncounterWhereInput = {
      ...(where.includeActiveAcrossDates
        ? {
            OR: [
              { queueDate: where.queueDate },
              { status: { in: activePrismaStatuses } },
            ],
          }
        : { queueDate: where.queueDate }),
      ...(where.locationIds
        ? { locationId: { in: where.locationIds } }
        : { locationId: where.locationId }),
      doctorId: where.doctorId,
    };
    const triageWhere = buildTriageWhere(where.triageStatuses);
    const prismaWhere: Prisma.EncounterWhereInput = {
      ...scopeWhere,
      ...(where.statuses
        ? { status: { in: where.statuses } }
        : { status: where.status }),
      ...triageWhere,
    };
    const statusCountStatuses = Object.values(PrismaEncounterStatus);
    const [records, total, ...statusCounts] = await this.prisma.$transaction([
      this.prisma.encounter.findMany({
        where: prismaWhere,
        include: encounterInclude,
        orderBy: [{ queueNumber: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.encounter.count({ where: prismaWhere }),
      ...statusCountStatuses.map((status) =>
        this.prisma.encounter.count({
          where: { ...scopeWhere, status },
        }),
      ),
    ]);
    const counts = Object.fromEntries(
      statusCountStatuses.map((status, index) => [
        fromPrismaEncounterStatus(status),
        statusCounts[index],
      ]),
    ) as EncounterStatusCounts;
    return {
      records,
      total,
      statusCounts: counts,
    };
  }

  async findHistory(
    where: EncounterHistoryListWhere,
    page: number,
    pageSize: number,
  ): Promise<{ records: EncounterWithRelations[]; total: number }> {
    const normalizedSearch = where.search?.trim();
    const searchWhere: Prisma.EncounterWhereInput | undefined = normalizedSearch
      ? {
          OR: [
            {
              encounterNumber: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
            {
              patient: {
                is: {
                  OR: [
                    {
                      fullName: {
                        contains: normalizedSearch,
                        mode: 'insensitive',
                      },
                    },
                    {
                      medicalRecNo: {
                        contains: normalizedSearch,
                        mode: 'insensitive',
                      },
                    },
                    {
                      nik: {
                        contains: normalizedSearch,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : undefined;
    const prismaWhere: Prisma.EncounterWhereInput = {
      queueDate: { gte: where.fromDate, lte: where.toDate },
      doctorId: where.doctorId,
      status: where.status,
      ...(searchWhere ?? {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.encounter.findMany({
        where: prismaWhere,
        include: encounterInclude,
        orderBy: [
          { queueDate: 'desc' },
          { queueNumber: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.encounter.count({ where: prismaWhere }),
    ]);
    return { records, total };
  }

  findById(id: string): Promise<EncounterWithRelations | null> {
    return this.prisma.encounter.findUnique({
      where: { id },
      include: encounterInclude,
    });
  }

  findByIdInTransaction(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<EncounterWithRelations | null> {
    return transaction.encounter.findUnique({
      where: { id },
      include: encounterInclude,
    });
  }

  async nextEncounterNumber(
    transaction: Prisma.TransactionClient,
    year: string,
  ): Promise<string> {
    const rows = await transaction.$queryRaw<Array<{ value: bigint }>>(
      Prisma.sql`SELECT nextval('encounter_number_seq') AS value`,
    );
    const value = Number(rows[0]?.value);
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(
        'Sequence nomor Encounter tidak menghasilkan nilai valid',
      );
    }
    return `ENC-${year}-${String(value).padStart(6, '0')}`;
  }

  async nextQueueNumber(
    transaction: Prisma.TransactionClient,
    locationId: string,
    queueDate: Date,
  ): Promise<number> {
    const id = randomUUID();
    const rows = await transaction.$queryRaw<
      Array<{ lastIssuedNumber: number }>
    >(
      Prisma.sql`
        INSERT INTO "EncounterQueueCounter"
          ("id", "locationId", "queueDate", "lastIssuedNumber", "createdAt", "updatedAt")
        VALUES (${id}, ${locationId}, ${queueDate}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("locationId", "queueDate")
        DO UPDATE SET
          "lastIssuedNumber" = "EncounterQueueCounter"."lastIssuedNumber" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "lastIssuedNumber"
      `,
    );
    const value = Number(rows[0]?.lastIssuedNumber);
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error('Counter nomor antrean tidak menghasilkan nilai valid');
    }
    return value;
  }
}

function buildTriageWhere(
  statuses: PrismaTriageStatus[] | undefined,
): Prisma.EncounterWhereInput {
  if (!statuses || statuses.length === 0) return {};

  const conditions: Prisma.EncounterWhereInput[] = [];
  if (statuses.includes(PrismaTriageStatus.NOT_STARTED)) {
    conditions.push({ medicalRecord: null });
  }

  const persistedStatuses = statuses.filter(
    (status) => status !== PrismaTriageStatus.NOT_STARTED,
  );
  if (persistedStatuses.length > 0) {
    conditions.push({
      medicalRecord: {
        is: { triageStatus: { in: persistedStatuses } },
      },
    });
  }

  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}
