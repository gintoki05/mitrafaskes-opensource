import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { MaritalStatusSummary } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';

type MaritalStatusRecord = Prisma.MasterMaritalStatusGetPayload<
  Prisma.MasterMaritalStatusDefaultArgs
>;

const toMaritalStatusSummary = (
  record: MaritalStatusRecord,
): MaritalStatusSummary => ({
  code: record.code,
  display: record.display,
  active: record.active,
  displayOrder: record.displayOrder,
  source: record.source,
  sourceVersion: record.sourceVersion ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

@Injectable()
export class MasterMaritalStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<MaritalStatusSummary[]> {
    const records = await this.prisma.masterMaritalStatus.findMany({
      where: { active: true },
      orderBy: [
        { displayOrder: 'asc' },
        { display: 'asc' },
        { code: 'asc' },
      ],
    });

    return records.map(toMaritalStatusSummary);
  }
}
