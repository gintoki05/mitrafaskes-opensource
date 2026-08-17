import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  Icd10Summary,
  MasterDataIcd10Response,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';

type Icd10Record = Prisma.MasterIcd10GetPayload<Prisma.MasterIcd10DefaultArgs>;

const toIcd10Summary = (record: Icd10Record): Icd10Summary => ({
  code: record.code,
  display: record.display,
  nameIndo: record.nameIndo ?? undefined,
  nameEng: record.nameEng,
  active: record.active,
  displayOrder: record.displayOrder,
  source: record.source,
  sourceVersion: record.sourceVersion ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export interface MasterIcd10ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class MasterIcd10Service {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: MasterIcd10ListQuery = {},
  ): Promise<MasterDataIcd10Response> {
    const page = this.normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const pageSize = Math.min(
      this.normalizePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const where = this.buildWhere(query.search);

    const [records, total] = await Promise.all([
      this.prisma.masterIcd10.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.masterIcd10.count({ where }),
    ]);

    return {
      items: records.map(toIcd10Summary),
      meta: { page, pageSize, total },
    };
  }

  async findByCodes(codes: readonly string[]): Promise<Icd10Summary[]> {
    const normalizedCodes = [
      ...new Set(codes.map((code) => code.trim()).filter(Boolean)),
    ];
    if (normalizedCodes.length === 0) return [];

    const records = await this.prisma.masterIcd10.findMany({
      where: { active: true, code: { in: normalizedCodes } },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });

    return records.map(toIcd10Summary);
  }

  private buildWhere(search?: string): Prisma.MasterIcd10WhereInput {
    const normalizedSearch = search?.trim();
    return {
      active: true,
      ...(normalizedSearch
        ? {
            OR: [
              { code: { contains: normalizedSearch, mode: 'insensitive' } },
              { display: { contains: normalizedSearch, mode: 'insensitive' } },
              { nameIndo: { contains: normalizedSearch, mode: 'insensitive' } },
              { nameEng: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
  ) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
      ? value
      : fallback;
  }
}
