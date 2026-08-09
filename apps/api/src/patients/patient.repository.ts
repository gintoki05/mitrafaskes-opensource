import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  Patient,
  PatientListQuery,
  PatientListResponse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { patientInclude, toPatient } from './patient.mapper';
import { ValidatedPatientInput } from './patient.validation';

export type PatientConflictField = 'nik' | 'primaryIdentifier' | 'medicalRecNo';

export class PatientNotFoundError extends Error {
  constructor() {
    super('Pasien tidak ditemukan');
    this.name = 'PatientNotFoundError';
  }
}

export class PatientIdentityConflictError extends Error {
  constructor(readonly field: PatientConflictField) {
    super(`Identitas pasien sudah digunakan: ${field}`);
    this.name = 'PatientIdentityConflictError';
  }
}

const uniqueDetails = (error: unknown): string[] => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return [];
  if (error.code !== 'P2002') return [];

  const target = error.meta?.target;
  const targets = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];
  return [...targets, error.message].map((value) => value.toLowerCase());
};

const matchesUniqueField = (details: string[], field: string): boolean =>
  details.some((candidate) => candidate.includes(field.toLowerCase()));

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const normalizePositiveInteger = (
  value: number | undefined,
  fallback: number,
) =>
  value !== undefined && Number.isInteger(value) && value > 0
    ? value
    : fallback;

@Injectable()
export class PatientRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly medicalRecordNumbers: MedicalRecordNumberGenerator,
  ) {}

  async findMany(input: PatientListQuery = {}): Promise<PatientListResponse> {
    const page = normalizePositiveInteger(input.page, DEFAULT_PAGE);
    const pageSize = Math.min(
      normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const normalizedSearch = input.search?.trim();
    const where: Prisma.PatientWhereInput | undefined = normalizedSearch
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
            {
              identifiers: {
                some: {
                  normalizedValue: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              names: {
                some: {
                  text: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              telecoms: {
                some: {
                  normalizedValue: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        }
      : undefined;

    const [records, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: patientInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      items: records.map(toPatient),
      meta: { page, pageSize, total },
    };
  }

  async findById(id: string): Promise<Patient | null> {
    const record = await this.prisma.patient.findUnique({
      where: { id },
      include: patientInclude,
    });
    return record ? toPatient(record) : null;
  }

  async create(input: ValidatedPatientInput): Promise<Patient> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const medicalRecNo = await this.medicalRecordNumbers.next();
      try {
        const record = await this.prisma.patient.create({
          data: this.buildPatientData(input, medicalRecNo),
          include: patientInclude,
        });
        return toPatient(record);
      } catch (error) {
        const details = uniqueDetails(error);
        if (
          matchesUniqueField(details, 'active_nik') ||
          matchesUniqueField(details, 'patient_nik') ||
          matchesUniqueField(details, '"nik"')
        ) {
          throw new PatientIdentityConflictError('nik');
        }
        if (matchesUniqueField(details, 'active_primary')) {
          throw new PatientIdentityConflictError('primaryIdentifier');
        }
        if (matchesUniqueField(details, 'medicalrecno')) {
          continue;
        }
        throw error;
      }
    }

    throw new PatientIdentityConflictError('medicalRecNo');
  }

  async update(id: string, input: ValidatedPatientInput): Promise<Patient> {
    try {
      const record = await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.patient.findUnique({
          where: { id },
          select: { id: true, medicalRecNo: true, satusehatId: true },
        });
        if (!current) throw new PatientNotFoundError();

        await this.updateRelatedPersonDetails(
          transaction,
          id,
          input.relationships,
        );

        const archivedAt = new Date();
        await Promise.all([
          transaction.patientIdentifier.updateMany({
            where: { patientId: id, active: true },
            data: { active: false },
          }),
          transaction.patientTelecom.updateMany({
            where: { patientId: id, active: true },
            data: { active: false },
          }),
          transaction.patientAddress.updateMany({
            where: { patientId: id, active: true },
            data: { active: false },
          }),
          transaction.patientRelationship.updateMany({
            where: { patientId: id, active: true },
            data: { active: false },
          }),
          transaction.patientName.updateMany({
            where: {
              patientId: id,
              validTo: null,
              OR: [{ validFrom: null }, { validFrom: { lte: archivedAt } }],
            },
            data: { validTo: archivedAt },
          }),
        ]);

        return transaction.patient.update({
          where: { id },
          data: {
            ...this.buildPatientData(
              input,
              current.medicalRecNo,
              current.satusehatId,
            ),
            version: { increment: 1 },
          },
          include: patientInclude,
        });
      });

      return toPatient(record);
    } catch (error) {
      const details = uniqueDetails(error);
      if (
        matchesUniqueField(details, 'active_nik') ||
        matchesUniqueField(details, 'patient_nik') ||
        matchesUniqueField(details, '"nik"')
      ) {
        throw new PatientIdentityConflictError('nik');
      }
      if (matchesUniqueField(details, 'active_primary')) {
        throw new PatientIdentityConflictError('primaryIdentifier');
      }
      throw error;
    }
  }

  private buildPatientData(
    input: ValidatedPatientInput,
    medicalRecNo: string,
    existingSatusehatId?: string | null,
  ) {
    return {
      nik: input.nik ?? null,
      fullName: input.fullName,
      birthDate: input.birthDate,
      gender: input.gender,
      address: input.address ?? null,
      phone: input.phone ?? null,
      medicalRecNo,
      satusehatId: input.satusehatId ?? existingSatusehatId ?? null,
      active: input.active,
      birthPlaceText: input.birthPlaceText ?? null,
      multipleBirthOrder: input.multipleBirthOrder ?? null,
      deceasedAt: input.deceasedAt ?? null,
      maritalStatusCode: input.maritalStatusCode ?? null,
      citizenshipCode: input.citizenshipCode ?? null,
      identifiers: {
        create: input.identifiers.map((identifier) => ({
          type: identifier.type,
          system: identifier.system,
          value: identifier.value,
          normalizedValue: identifier.normalizedValue,
          verificationStatus: identifier.verificationStatus,
          isPrimary: identifier.isPrimary,
          active: identifier.active,
          issuer: identifier.issuer,
          validFrom: identifier.validFrom,
          validTo: identifier.validTo,
        })),
      },
      names: {
        create: input.names.map((name) => ({
          use: name.use,
          text: name.text,
          given: name.given,
          family: name.family,
          prefix: name.prefix,
          suffix: name.suffix,
          validFrom: name.validFrom,
          validTo: name.validTo,
        })),
      },
      telecoms: {
        create: input.telecoms.map((telecom) => ({
          system: telecom.system,
          value: telecom.value,
          normalizedValue: telecom.normalizedValue,
          use: telecom.use,
          rank: telecom.rank,
          verificationStatus: telecom.verificationStatus,
          active: telecom.active,
          validFrom: telecom.validFrom,
          validTo: telecom.validTo,
        })),
      },
      addresses: {
        create: input.addresses.map((address) => ({
          use: address.use,
          type: address.type,
          text: address.text,
          lines: address.lines,
          postalCode: address.postalCode,
          countryCode: address.countryCode,
          provinceCode: address.provinceCode,
          provinceName: address.provinceName,
          regencyCode: address.regencyCode,
          regencyName: address.regencyName,
          districtCode: address.districtCode,
          districtName: address.districtName,
          villageCode: address.villageCode,
          villageName: address.villageName,
          active: address.active,
          validFrom: address.validFrom,
          validTo: address.validTo,
        })),
      },
      relationshipsFrom: {
        create: input.relationships.map((relationship) => ({
          relationshipCode: relationship.relationshipCode,
          relatedPatient: relationship.relatedPatientId
            ? { connect: { id: relationship.relatedPatientId } }
            : undefined,
          relatedPerson: relationship.relatedPersonId
            ? { connect: { id: relationship.relatedPersonId } }
            : relationship.relatedPerson
              ? {
                  create: {
                    fullName: relationship.relatedPerson.fullName,
                    gender: relationship.relatedPerson.gender,
                    birthDate: relationship.relatedPerson.birthDate,
                    phone: relationship.relatedPerson.phone,
                    email: relationship.relatedPerson.email,
                    addressText: relationship.relatedPerson.addressText,
                  },
                }
              : undefined,
          startAt: relationship.startAt,
          endAt: relationship.endAt,
          isGuardian: relationship.isGuardian,
          contactPriority: relationship.contactPriority,
          active: relationship.active,
        })),
      },
    };
  }

  private async updateRelatedPersonDetails(
    transaction: Prisma.TransactionClient,
    patientId: string,
    relationships: ValidatedPatientInput['relationships'],
  ): Promise<void> {
    for (const relationship of relationships) {
      if (!relationship.relatedPersonId || !relationship.relatedPerson)
        continue;

      await transaction.patientRelatedPerson.updateMany({
        where: {
          id: relationship.relatedPersonId,
          relationships: { some: { patientId } },
        },
        data: {
          fullName: relationship.relatedPerson.fullName,
          gender: relationship.relatedPerson.gender ?? null,
          birthDate: relationship.relatedPerson.birthDate ?? null,
          phone: relationship.relatedPerson.phone ?? null,
          email: relationship.relatedPerson.email ?? null,
          addressText: relationship.relatedPerson.addressText ?? null,
        },
      });
    }
  }
}
