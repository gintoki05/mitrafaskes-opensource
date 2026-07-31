import { Prisma } from '@prisma/client';
import { Gender } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { PatientRepository } from './patient.repository';

describe('PatientRepository', () => {
  it('retries with a fresh sequence value after a legacy RM collision', async () => {
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['medicalRecNo'] },
      },
    );
    const createdAt = new Date('2026-07-31T00:00:00.000Z');
    const create = jest
      .fn()
      .mockRejectedValueOnce(uniqueConflict)
      .mockResolvedValueOnce({
        id: 'patient-1',
        nik: '3171012304900003',
        fullName: 'Dewi Lestari',
        birthDate: new Date('1990-04-23T00:00:00.000Z'),
        gender: Gender.FEMALE,
        address: null,
        phone: null,
        medicalRecNo: 'RM-2026-000004',
        satusehatId: null,
        createdAt,
        updatedAt: createdAt,
      });
    const prisma = {
      patient: { create },
    } as unknown as PrismaService;
    const medicalRecordNumbers = {
      next: jest
        .fn()
        .mockResolvedValueOnce('RM-2026-000003')
        .mockResolvedValueOnce('RM-2026-000004'),
    } as unknown as MedicalRecordNumberGenerator;
    const repository = new PatientRepository(prisma, medicalRecordNumbers);

    const patient = await repository.create({
      nik: '3171012304900003',
      fullName: 'Dewi Lestari',
      birthDate: new Date('1990-04-23T00:00:00.000Z'),
      gender: Gender.FEMALE,
    });

    expect(patient.medicalRecNo).toBe('RM-2026-000004');
    expect(medicalRecordNumbers.next).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          medicalRecNo: 'RM-2026-000004',
        }),
      }),
    );
  });
});
