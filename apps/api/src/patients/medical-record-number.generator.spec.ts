import { PrismaService } from '../database/prisma.service';
import {
  MedicalRecordNumberGenerator,
  formatMedicalRecordNumber,
} from './medical-record-number.generator';

describe('MedicalRecordNumberGenerator', () => {
  it('formats PostgreSQL sequence values consistently', () => {
    expect(
      formatMedicalRecordNumber(42n, new Date('2026-07-31T00:00:00.000Z')),
    ).toBe('RM-2026-000042');
  });

  it('returns a unique number for every sequence allocation', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ nextValue: 100n }])
      .mockResolvedValueOnce([{ nextValue: 101n }]);
    const prisma = {
      $queryRawUnsafe: query,
    } as unknown as PrismaService;
    const generator = new MedicalRecordNumberGenerator(prisma);
    const date = new Date('2026-07-31T00:00:00.000Z');

    const numbers = await Promise.all([
      generator.next(date),
      generator.next(date),
    ]);

    expect(numbers).toEqual(['RM-2026-000100', 'RM-2026-000101']);
    expect(new Set(numbers).size).toBe(2);
  });
});
