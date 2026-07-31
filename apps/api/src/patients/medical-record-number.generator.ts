import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const MEDICAL_RECORD_SEQUENCE = 'patient_medical_record_number_seq' as const;

export const formatMedicalRecordNumber = (
  sequenceValue: bigint,
  date = new Date(),
): string =>
  `RM-${date.getUTCFullYear()}-${sequenceValue.toString().padStart(6, '0')}`;

@Injectable()
export class MedicalRecordNumberGenerator {
  constructor(private readonly prisma: PrismaService) {}

  async next(date = new Date()): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ nextValue: bigint }>
    >(`SELECT nextval('${MEDICAL_RECORD_SEQUENCE}') AS "nextValue"`);
    const nextValue = rows[0]?.nextValue;
    if (nextValue === undefined) {
      throw new Error('PostgreSQL tidak mengembalikan nomor rekam medis');
    }

    return formatMedicalRecordNumber(nextValue, date);
  }
}
