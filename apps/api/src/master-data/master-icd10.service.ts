import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Icd10Summary } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';

type Icd10Record = Prisma.MasterIcd10GetPayload<
  Prisma.MasterIcd10DefaultArgs
>;

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

@Injectable()
export class MasterIcd10Service {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string): Promise<Icd10Summary[]> {
    const normalizedSearch = search?.trim();
    const where: Prisma.MasterIcd10WhereInput = {
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

    const records = await this.prisma.masterIcd10.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });

    return records.map(toIcd10Summary);
  }
}
