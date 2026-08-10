import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MedicalRecord, SaveMedicalRecordDto } from '@mitrafaskes/shared';
import type { AuthenticatedUser } from '../auth/session-permission.guard';
import { PrismaService } from '../database/prisma.service';
import { MasterIcd10Service } from '../master-data/master-icd10.service';
import { EncountersService } from '../encounters/encounters.service';

const medicalRecordInclude = {
  diagnoses: { include: { icd10: true } },
  prescriptions: true,
} satisfies Prisma.MedicalRecordInclude;

type MedicalRecordWithRelations = Prisma.MedicalRecordGetPayload<{
  include: typeof medicalRecordInclude;
}>;

const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : {};

const optionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException({
      code: 'RME_VALIDATION_FAILED',
      message: `${field} wajib diisi`,
    });
  }
  return value.trim();
};

function toMedicalRecord(record: MedicalRecordWithRelations): MedicalRecord {
  return {
    id: record.id,
    encounterId: record.encounterId,
    anamnesis: record.anamnesis ?? undefined,
    systolic: record.systolic ?? undefined,
    diastolic: record.diastolic ?? undefined,
    heartRate: record.heartRate ?? undefined,
    temperature: record.temperature ?? undefined,
    weight: record.weight ?? undefined,
    height: record.height ?? undefined,
    diagnoses: record.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      icd10Code: diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
      icd10: diagnosis.icd10
        ? {
            code: diagnosis.icd10.code,
            display: diagnosis.icd10.display,
            nameIndo: diagnosis.icd10.nameIndo ?? undefined,
            nameEng: diagnosis.icd10.nameEng,
          }
        : undefined,
    })),
    prescriptions: record.prescriptions.map((prescription) => ({
      id: prescription.id,
      medicineName: prescription.medicineName,
      kfaCode: prescription.kfaCode ?? undefined,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      quantity: prescription.quantity,
      instructions: prescription.instructions ?? undefined,
    })),
    createdAt: record.createdAt.toISOString(),
  };
}

@Injectable()
export class RmeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly icd10: MasterIcd10Service,
    private readonly encounters: EncountersService,
  ) {}

  async findByEncounterId(encounterId: string): Promise<MedicalRecord | null> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { encounterId },
      include: medicalRecordInclude,
    });
    return record ? toMedicalRecord(record) : null;
  }

  async save(
    input: unknown,
    actor: AuthenticatedUser,
  ): Promise<MedicalRecord> {
    const body = recordOf(input);
    const encounterId = requiredString(body.encounterId, 'encounterId');
    const encounter = await this.encounters.findById(encounterId);
    if (!encounter) throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    if (encounter.status !== 'IN_PROGRESS') {
      throw new ConflictException({
        code: 'RME_ENCOUNTER_NOT_IN_PROGRESS',
        message: 'Encounter harus berstatus IN_PROGRESS sebelum RME diselesaikan',
      });
    }

    const diagnosisInputs = Array.isArray(body.diagnoses) ? body.diagnoses : [];
    const diagnosisCodes = diagnosisInputs.map((diagnosis) =>
      requiredString(recordOf(diagnosis).icd10Code, 'icd10Code'),
    );
    const icd10Entries = await this.icd10.findByCodes(diagnosisCodes);
    const icd10ByCode = new Map(icd10Entries.map((entry) => [entry.code, entry]));
    const missingCodes = diagnosisCodes.filter((code) => !icd10ByCode.has(code));
    if (missingCodes.length > 0) {
      throw new BadRequestException({
        code: 'RME_ICD10_NOT_FOUND',
        message: 'Kode ICD-10 tidak ditemukan di katalog lokal',
        codes: missingCodes,
      });
    }

    const diagnoses = diagnosisInputs.map((diagnosis) => {
      const value = recordOf(diagnosis);
      return {
        icd10Code: String(value.icd10Code),
        isPrimary: value.isPrimary !== false,
      };
    });
    const prescriptions = (Array.isArray(body.prescriptions) ? body.prescriptions : []).map(
      (prescription) => {
        const value = recordOf(prescription);
        const quantity = Number(value.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new BadRequestException({
            code: 'RME_VALIDATION_FAILED',
            message: 'Jumlah resep harus berupa bilangan bulat positif',
          });
        }
        return {
          medicineName: requiredString(value.medicineName, 'medicineName'),
          kfaCode: typeof value.kfaCode === 'string' && value.kfaCode.trim() ? value.kfaCode.trim() : null,
          dosage: requiredString(value.dosage, 'dosage'),
          frequency: requiredString(value.frequency, 'frequency'),
          quantity,
          instructions: typeof value.instructions === 'string' ? value.instructions.trim() || null : null,
        };
      },
    );

    const record = await this.prisma.$transaction(async (transaction) => {
      const saved = await transaction.medicalRecord.upsert({
        where: { encounterId },
        create: {
          encounterId,
          anamnesis: typeof body.anamnesis === 'string' ? body.anamnesis : null,
          systolic: optionalNumber(body.systolic),
          diastolic: optionalNumber(body.diastolic),
          heartRate: optionalNumber(body.heartRate),
          temperature: optionalNumber(body.temperature),
          weight: optionalNumber(body.weight),
          height: optionalNumber(body.height),
          diagnoses: { create: diagnoses },
          prescriptions: { create: prescriptions },
        },
        update: {
          anamnesis: typeof body.anamnesis === 'string' ? body.anamnesis : null,
          systolic: optionalNumber(body.systolic),
          diastolic: optionalNumber(body.diastolic),
          heartRate: optionalNumber(body.heartRate),
          temperature: optionalNumber(body.temperature),
          weight: optionalNumber(body.weight),
          height: optionalNumber(body.height),
          diagnoses: { deleteMany: {}, create: diagnoses },
          prescriptions: { deleteMany: {}, create: prescriptions },
        },
        include: medicalRecordInclude,
      });
      await this.encounters.saveRmeCompletion(
        transaction,
        encounterId,
        encounter.version,
        actor,
      );
      return saved;
    });

    return toMedicalRecord(record);
  }
}
