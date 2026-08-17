import { Prisma } from '@prisma/client';
import {
  Gender,
  PatientIdentifierType,
  PatientNameUse,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import {
  PatientIdentityConflictError,
  PatientRepository,
} from './patient.repository';
import { validatePatientInput } from './patient.validation';

const createdAt = new Date('2026-07-31T00:00:00.000Z');

const structuredRecord = {
  id: 'patient-1',
  nik: '3171012304900003',
  fullName: 'Dewi Lestari',
  birthDate: new Date('1990-04-23T00:00:00.000Z'),
  gender: Gender.FEMALE,
  address: null,
  phone: null,
  medicalRecNo: 'RM-2026-000004',
  active: true,
  birthPlaceText: null,
  multipleBirthOrder: null,
  deceasedAt: null,
  maritalStatusCode: null,
  citizenshipCode: null,
  version: 1,
  createdAt,
  updatedAt: createdAt,
  identifiers: [
    {
      id: 'identifier-1',
      patientId: 'patient-1',
      type: PatientIdentifierType.NIK,
      system: 'urn:id:nik',
      value: '3171012304900003',
      normalizedValue: '3171012304900003',
      verificationStatus: 'UNVERIFIED',
      isPrimary: true,
      active: true,
      issuer: null,
      validFrom: null,
      validTo: null,
      createdAt,
      updatedAt: createdAt,
    },
  ],
  names: [
    {
      id: 'name-1',
      patientId: 'patient-1',
      use: PatientNameUse.OFFICIAL,
      text: 'Dewi Lestari',
      given: [],
      family: null,
      prefix: [],
      suffix: [],
      validFrom: null,
      validTo: null,
      createdAt,
      updatedAt: createdAt,
    },
  ],
  telecoms: [],
  addresses: [],
  relationshipsFrom: [],
};

describe('PatientRepository', () => {
  it('filters by active status and returns status counts for the search scope', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    const repository = new PatientRepository(
      { patient: { findMany, count } } as unknown as PrismaService,
      {} as MedicalRecordNumberGenerator,
    );

    const response = await repository.findMany({
      active: true,
      page: 2,
      pageSize: 10,
    });

    expect(response).toEqual({
      items: [],
      meta: { page: 2, pageSize: 10, total: 2 },
      statusCounts: { active: 3, inactive: 1 },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true }, skip: 10, take: 10 }),
    );
    expect(count).toHaveBeenNthCalledWith(1, { where: { active: true } });
    expect(count).toHaveBeenNthCalledWith(2, { where: { active: true } });
    expect(count).toHaveBeenNthCalledWith(3, { where: { active: false } });
  });

  it('retries with a fresh sequence value after a legacy RM collision', async () => {
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on medicalRecNo',
      {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['medicalRecNo'] },
      },
    );
    const create = jest
      .fn()
      .mockRejectedValueOnce(uniqueConflict)
      .mockResolvedValueOnce(structuredRecord);
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

    const patient = await repository.create(
      validatePatientInput({
        nik: '3171012304900003',
        fullName: 'Dewi Lestari',
        birthDate: '1990-04-23',
        gender: Gender.FEMALE,
      }),
    );

    expect(patient.medicalRecNo).toBe('RM-2026-000004');
    expect(patient.identifiers).toEqual([
      expect.objectContaining({
        normalizedValue: '3171012304900003',
        isPrimary: true,
      }),
    ]);
    expect(medicalRecordNumbers.next).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          nik: '3171012304900003',
          medicalRecNo: 'RM-2026-000004',
          identifiers: {
            create: [
              expect.objectContaining({
                normalizedValue: '3171012304900003',
              }),
            ],
          },
          names: {
            create: [
              expect.objectContaining({
                use: PatientNameUse.OFFICIAL,
                text: 'Dewi Lestari',
              }),
            ],
          },
        }),
      }),
    );
  });

  it('writes multi-value children and related person in the same nested create', async () => {
    const create = jest.fn().mockResolvedValue({
      ...structuredRecord,
      nik: null,
      identifiers: [],
      telecoms: [],
      addresses: [],
      relationshipsFrom: [],
    });
    const repository = new PatientRepository(
      { patient: { create } } as unknown as PrismaService,
      {
        next: jest.fn().mockResolvedValue('RM-2026-000005'),
      } as unknown as MedicalRecordNumberGenerator,
    );

    await repository.create(
      validatePatientInput({
        fullName: 'Bayi Ny. Sari',
        birthDate: '2026-07-31',
        gender: Gender.FEMALE,
        telecoms: [
          { system: 'PHONE', use: 'MOBILE', value: '081211112222' },
          {
            system: 'EMAIL',
            use: 'HOME',
            value: 'keluarga@example.test',
            rank: 2,
          },
        ],
        addresses: [
          {
            use: 'HOME',
            type: 'PHYSICAL',
            lines: ['Jl. Mawar 1'],
            countryCode: 'ID',
          },
          {
            use: 'OLD',
            type: 'PHYSICAL',
            text: 'Jl. Lama 2',
            active: false,
          },
        ],
        relationships: [
          {
            relationshipCode: 'GUARDIAN',
            relatedPerson: {
              fullName: 'Rina Wulandari',
              phone: '081355556666',
            },
          },
        ],
      }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          telecoms: { create: expect.arrayContaining([expect.any(Object)]) },
          addresses: {
            create: expect.arrayContaining([
              expect.objectContaining({ countryCode: 'ID' }),
            ]),
          },
          relationshipsFrom: {
            create: [
              expect.objectContaining({
                relatedPerson: {
                  create: expect.objectContaining({
                    fullName: 'Rina Wulandari',
                  }),
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  it.each([
    ['PatientIdentifier_active_nik_national_key', 'nik'] as const,
    [
      'PatientIdentifier_active_primary_per_type_key',
      'primaryIdentifier',
    ] as const,
  ])('maps %s to an explicit %s conflict', async (target, field) => {
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError(
      `Unique constraint failed: ${target}`,
      {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target },
      },
    );
    const repository = new PatientRepository(
      {
        patient: { create: jest.fn().mockRejectedValue(uniqueConflict) },
      } as unknown as PrismaService,
      {
        next: jest.fn().mockResolvedValue('RM-2026-000006'),
      } as unknown as MedicalRecordNumberGenerator,
    );

    await expect(
      repository.create(
        validatePatientInput({
          nik: '3171012304900003',
          fullName: 'Dewi Lestari',
          birthDate: '1990-04-23',
          gender: Gender.FEMALE,
        }),
      ),
    ).rejects.toEqual(new PatientIdentityConflictError(field));
  });
});
