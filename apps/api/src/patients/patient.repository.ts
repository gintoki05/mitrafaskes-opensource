import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  Gender,
  Patient,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
  VerificationStatus,
  AddressType,
  AddressUse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { ValidatedPatientInput } from './patient.validation';

export type PatientConflictField = 'nik' | 'primaryIdentifier' | 'medicalRecNo';

export class PatientIdentityConflictError extends Error {
  constructor(readonly field: PatientConflictField) {
    super(`Identitas pasien sudah digunakan: ${field}`);
    this.name = 'PatientIdentityConflictError';
  }
}

const patientInclude = {
  identifiers: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  names: {
    orderBy: { createdAt: 'asc' as const },
  },
  telecoms: {
    orderBy: [{ rank: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  addresses: {
    orderBy: { createdAt: 'asc' as const },
  },
  relationshipsFrom: {
    include: { relatedPerson: true },
    orderBy: [
      { contactPriority: 'asc' as const },
      { createdAt: 'asc' as const },
    ],
  },
} satisfies Prisma.PatientInclude;

type PatientRecord = Prisma.PatientGetPayload<{
  include: typeof patientInclude;
}>;

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

const optionalDate = (value: Date | null): string | undefined =>
  value?.toISOString();

const toPatient = (record: PatientRecord): Patient => ({
  id: record.id,
  nik: record.nik ?? undefined,
  fullName: record.fullName,
  birthDate: record.birthDate.toISOString().slice(0, 10),
  gender: record.gender as Gender,
  address: record.address ?? undefined,
  phone: record.phone ?? undefined,
  medicalRecNo: record.medicalRecNo,
  satusehatId: record.satusehatId ?? undefined,
  active: record.active,
  birthPlaceText: record.birthPlaceText ?? undefined,
  multipleBirthOrder: record.multipleBirthOrder ?? undefined,
  deceasedAt: optionalDate(record.deceasedAt),
  maritalStatusCode: record.maritalStatusCode ?? undefined,
  citizenshipCode: record.citizenshipCode ?? undefined,
  version: record.version,
  identifiers: record.identifiers.map((identifier) => ({
    id: identifier.id,
    type: identifier.type as PatientIdentifierType,
    system: identifier.system,
    value: identifier.value,
    normalizedValue: identifier.normalizedValue,
    verificationStatus: identifier.verificationStatus as VerificationStatus,
    isPrimary: identifier.isPrimary,
    active: identifier.active,
    issuer: identifier.issuer ?? undefined,
    validFrom: optionalDate(identifier.validFrom),
    validTo: optionalDate(identifier.validTo),
  })),
  names: record.names.map((name) => ({
    id: name.id,
    use: name.use as PatientNameUse,
    text: name.text,
    given: name.given,
    family: name.family ?? undefined,
    prefix: name.prefix,
    suffix: name.suffix,
    validFrom: optionalDate(name.validFrom),
    validTo: optionalDate(name.validTo),
  })),
  telecoms: record.telecoms.map((telecom) => ({
    id: telecom.id,
    system: telecom.system as TelecomSystem,
    value: telecom.value,
    normalizedValue: telecom.normalizedValue,
    use: telecom.use as TelecomUse,
    rank: telecom.rank,
    verificationStatus: telecom.verificationStatus as VerificationStatus,
    active: telecom.active,
    validFrom: optionalDate(telecom.validFrom),
    validTo: optionalDate(telecom.validTo),
  })),
  addresses: record.addresses.map((address) => ({
    id: address.id,
    use: address.use as AddressUse,
    type: address.type as AddressType,
    text: address.text ?? undefined,
    lines: address.lines,
    postalCode: address.postalCode ?? undefined,
    countryCode: address.countryCode ?? undefined,
    provinceCode: address.provinceCode ?? undefined,
    provinceName: address.provinceName ?? undefined,
    regencyCode: address.regencyCode ?? undefined,
    regencyName: address.regencyName ?? undefined,
    districtCode: address.districtCode ?? undefined,
    districtName: address.districtName ?? undefined,
    villageCode: address.villageCode ?? undefined,
    villageName: address.villageName ?? undefined,
    active: address.active,
    validFrom: optionalDate(address.validFrom),
    validTo: optionalDate(address.validTo),
  })),
  relationships: record.relationshipsFrom.map((relationship) => ({
    id: relationship.id,
    relationshipCode: relationship.relationshipCode as PatientRelationshipCode,
    relatedPatientId: relationship.relatedPatientId ?? undefined,
    relatedPersonId: relationship.relatedPersonId ?? undefined,
    relatedPerson: relationship.relatedPerson
      ? {
          id: relationship.relatedPerson.id,
          fullName: relationship.relatedPerson.fullName,
          gender: relationship.relatedPerson.gender
            ? (relationship.relatedPerson.gender as Gender)
            : undefined,
          birthDate: relationship.relatedPerson.birthDate
            ?.toISOString()
            .slice(0, 10),
          phone: relationship.relatedPerson.phone ?? undefined,
          email: relationship.relatedPerson.email ?? undefined,
          addressText: relationship.relatedPerson.addressText ?? undefined,
        }
      : undefined,
    startAt: optionalDate(relationship.startAt),
    endAt: optionalDate(relationship.endAt),
    isGuardian: relationship.isGuardian,
    contactPriority: relationship.contactPriority ?? undefined,
    active: relationship.active,
  })),
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
      include: patientInclude,
      orderBy: { createdAt: 'desc' },
    });

    return records.map(toPatient);
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
          data: {
            nik: input.nik ?? null,
            fullName: input.fullName,
            birthDate: input.birthDate,
            gender: input.gender,
            address: input.address,
            phone: input.phone,
            medicalRecNo,
            active: input.active,
            birthPlaceText: input.birthPlaceText,
            multipleBirthOrder: input.multipleBirthOrder,
            deceasedAt: input.deceasedAt,
            maritalStatusCode: input.maritalStatusCode,
            citizenshipCode: input.citizenshipCode,
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
                relatedPerson: relationship.relatedPerson
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
                  : relationship.relatedPersonId
                    ? { connect: { id: relationship.relatedPersonId } }
                    : undefined,
                startAt: relationship.startAt,
                endAt: relationship.endAt,
                isGuardian: relationship.isGuardian,
                contactPriority: relationship.contactPriority,
                active: relationship.active,
              })),
            },
          },
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
}
