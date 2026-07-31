import { Injectable } from '@nestjs/common';
import {
  Gender as PrismaGender,
  Patient as PrismaPatient,
  Prisma,
} from '@prisma/client';
import { Gender, Patient } from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { ValidatedPatientInput } from './patient.validation';

export class PatientIdentityConflictError extends Error {
  constructor(readonly field: 'nik' | 'medicalRecNo') {
    super(`Identitas pasien sudah digunakan: ${field}`);
    this.name = 'PatientIdentityConflictError';
  }
}

const uniqueFields = (error: unknown): string[] => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return [];
  if (error.code !== 'P2002') return [];

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];
};

const matchesUniqueField = (fields: string[], field: string): boolean =>
  fields.some(
    (candidate) =>
      candidate === field ||
      candidate.toLowerCase().includes(`_${field.toLowerCase()}_`),
  );

const toPatient = (record: PrismaPatient): Patient => ({
  id: record.id,
  nik: record.nik ?? undefined,
  fullName: record.fullName,
  birthDate: record.birthDate.toISOString().slice(0, 10),
  gender: record.gender as Gender,
  address: record.address ?? undefined,
  phone: record.phone ?? undefined,
  medicalRecNo: record.medicalRecNo,
  satusehatId: record.satusehatId ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

@Injectable()
export class PatientRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly medicalRecordNumbers: MedicalRecordNumberGenerator,
  ) {}

  async findMany(search?: string): Promise<Patient[]> {
    const normalizedSearch = search?.trim();
    const records = await this.prisma.patient.findMany({
      where: normalizedSearch
        ? {
            OR: [
              { nik: { contains: normalizedSearch } },
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
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return records.map(toPatient);
  }

  async findById(id: string): Promise<Patient | null> {
    const record = await this.prisma.patient.findUnique({ where: { id } });
    return record ? toPatient(record) : null;
  }

  async create(input: ValidatedPatientInput): Promise<Patient> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const medicalRecNo = await this.medicalRecordNumbers.next();
      try {
        const record = await this.prisma.patient.create({
          data: {
            nik: input.nik ?? null,
            fullName: input.fullName,
            birthDate: input.birthDate,
            gender: input.gender as PrismaGender,
            address: input.address,
            phone: input.phone,
            medicalRecNo,
          },
        });
        return toPatient(record);
      } catch (error) {
        const fields = uniqueFields(error);
        if (matchesUniqueField(fields, 'nik')) {
          throw new PatientIdentityConflictError('nik');
        }
        if (matchesUniqueField(fields, 'medicalRecNo')) {
          continue;
        }
        throw error;
      }
    }

    throw new PatientIdentityConflictError('medicalRecNo');
  }
}
