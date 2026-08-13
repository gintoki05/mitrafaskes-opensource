import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
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
} satisfies Prisma.EncounterInclude;

export type EncounterWithRelations = Prisma.EncounterGetPayload<{
  include: typeof encounterInclude;
}>;

export interface EncounterListWhere {
  queueDate: Date;
  locationId?: string;
  doctorId?: string;
  status?: Prisma.EncounterWhereInput['status'];
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
  ): Promise<{ records: EncounterWithRelations[]; total: number }> {
    const prismaWhere: Prisma.EncounterWhereInput = {
      queueDate: where.queueDate,
      locationId: where.locationId,
      doctorId: where.doctorId,
      status: where.status,
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.encounter.findMany({
        where: prismaWhere,
        include: encounterInclude,
        orderBy: [{ queueNumber: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.encounter.count({ where: prismaWhere }),
    ]);
    return { records, total };
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
