import {
  AddressType,
  AddressUse,
  Gender,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
} from '@mitrafaskes/shared';
import {
  normalizeIdentifierValue,
  normalizeNik,
  PatientValidationError,
  validatePatientInput,
} from './patient.validation';

describe('patient validation', () => {
  it('normalizes legacy fields and creates compatibility child records', () => {
    const patient = validatePatientInput(
      {
        nik: '3171-0123 0490.0003',
        fullName: '  Dewi   Lestari  ',
        birthDate: '1990-04-23',
        gender: 'female',
        phone: '(0812) 3456-7890',
        address: '  Jl.   Merdeka  10 ',
      },
      new Date('2026-07-31T00:00:00.000Z'),
    );

    expect(patient).toEqual(
      expect.objectContaining({
        nik: '3171012304900003',
        fullName: 'Dewi Lestari',
        birthDate: new Date('1990-04-23T00:00:00.000Z'),
        gender: Gender.FEMALE,
        phone: '081234567890',
        address: 'Jl. Merdeka 10',
      }),
    );
    expect(patient.identifiers).toEqual([
      expect.objectContaining({
        type: PatientIdentifierType.NIK,
        normalizedValue: '3171012304900003',
        isPrimary: true,
        active: true,
      }),
    ]);
    expect(patient.names).toEqual([
      expect.objectContaining({
        use: PatientNameUse.OFFICIAL,
        text: 'Dewi Lestari',
      }),
    ]);
    expect(patient.telecoms).toEqual([
      expect.objectContaining({
        system: TelecomSystem.PHONE,
        normalizedValue: '081234567890',
      }),
    ]);
    expect(patient.addresses).toEqual([
      expect.objectContaining({
        use: AddressUse.HOME,
        text: 'Jl. Merdeka 10',
      }),
    ]);
    expect(normalizeNik(' 3171 0123 0490 0003 ')).toBe('3171012304900003');
  });

  it('allows a patient without NIK and does not apply the NIK validator to a passport', () => {
    const patient = validatePatientInput({
      fullName: 'Bayi Ny. Sari',
      birthDate: '2026-07-31',
      gender: Gender.FEMALE,
      identifiers: [
        {
          type: PatientIdentifierType.PASSPORT,
          system: 'urn:id:passport:id',
          value: 'a 123',
          isPrimary: true,
        },
      ],
    });

    expect(patient.nik).toBeUndefined();
    expect(patient.identifiers[0]).toEqual(
      expect.objectContaining({
        type: PatientIdentifierType.PASSPORT,
        normalizedValue: 'A 123',
      }),
    );
    expect(
      normalizeIdentifierValue(PatientIdentifierType.PASSPORT, ' p-7 '),
    ).toBe('P-7');
  });

  it('supports history periods, multi-value demographics, and mother/guardian relationships', () => {
    const patient = validatePatientInput({
      fullName: 'Bayi Ny. Sari',
      birthDate: '2026-07-31',
      gender: Gender.FEMALE,
      multipleBirthOrder: 2,
      identifiers: [
        {
          type: PatientIdentifierType.MOTHER_NIK,
          system: 'urn:id:nik',
          value: '3171-0123-0490-0003',
          isPrimary: true,
        },
      ],
      names: [
        {
          use: PatientNameUse.ALIAS,
          text: 'Bayi A',
          validFrom: '2026-07-31T00:00:00.000Z',
        },
        {
          use: PatientNameUse.OLD,
          text: 'Bayi Belum Bernama',
          validTo: '2026-07-30T23:59:59.000Z',
        },
      ],
      telecoms: [
        {
          system: TelecomSystem.PHONE,
          value: '0812-1111-2222',
          use: TelecomUse.MOBILE,
          rank: 1,
        },
        {
          system: TelecomSystem.EMAIL,
          value: 'KELUARGA@EXAMPLE.TEST',
          use: TelecomUse.HOME,
          rank: 2,
        },
      ],
      addresses: [
        {
          use: AddressUse.HOME,
          type: AddressType.BOTH,
          text: 'Jl. Mawar 1',
          lines: ['Jl. Mawar 1'],
          countryCode: 'id',
          provinceCode: '31',
          provinceName: 'DKI Jakarta',
          regencyCode: '3171',
          regencyName: 'Jakarta Selatan',
          districtCode: '317101',
          districtName: 'Kebayoran Baru',
          villageCode: '3171011001',
          villageName: 'Selong',
        },
        {
          use: AddressUse.OLD,
          type: AddressType.PHYSICAL,
          lines: ['Jl. Lama 2'],
          active: false,
          validTo: '2026-07-30T00:00:00.000Z',
        },
      ],
      relationships: [
        {
          relationshipCode: PatientRelationshipCode.MOTHER,
          relatedPatientId: 'patient-mother',
          contactPriority: 1,
        },
        {
          relationshipCode: PatientRelationshipCode.GUARDIAN,
          relatedPerson: {
            fullName: 'Rina Wulandari',
            phone: '(0813) 5555-6666',
          },
          contactPriority: 2,
        },
      ],
    });

    expect(patient.identifiers[0].normalizedValue).toBe('3171012304900003');
    expect(patient.names).toHaveLength(3);
    expect(patient.telecoms.map((entry) => entry.normalizedValue)).toEqual([
      '081211112222',
      'keluarga@example.test',
    ]);
    expect(patient.addresses).toHaveLength(2);
    expect(patient.addresses[0].countryCode).toBe('ID');
    expect(patient.relationships).toEqual([
      expect.objectContaining({
        relationshipCode: PatientRelationshipCode.MOTHER,
        relatedPatientId: 'patient-mother',
      }),
      expect.objectContaining({
        relationshipCode: PatientRelationshipCode.GUARDIAN,
        isGuardian: true,
        relatedPerson: expect.objectContaining({
          fullName: 'Rina Wulandari',
          phone: '081355556666',
        }),
      }),
    ]);
  });

  it('rejects multiple active NIKs, duplicate primary identifiers, and invalid periods explicitly', () => {
    expect.assertions(2);
    try {
      validatePatientInput({
        fullName: 'Dewi Lestari',
        birthDate: '1990-04-23',
        gender: Gender.FEMALE,
        identifiers: [
          {
            type: PatientIdentifierType.NIK,
            system: 'urn:id:nik',
            value: '3171012304900003',
            isPrimary: true,
          },
          {
            type: PatientIdentifierType.NIK,
            system: 'urn:id:nik',
            value: '3171012304900004',
            isPrimary: true,
          },
        ],
        telecoms: [
          {
            system: TelecomSystem.EMAIL,
            use: TelecomUse.HOME,
            value: 'dewi@example.test',
            validFrom: '2026-08-01T00:00:00.000Z',
            validTo: '2026-07-01T00:00:00.000Z',
          },
        ],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PatientValidationError);
      expect(
        (error as PatientValidationError).issues.map((issue) => issue.code),
      ).toEqual(
        expect.arrayContaining([
          'MULTIPLE_ACTIVE_NIK',
          'MULTIPLE_PRIMARY_IDENTIFIERS',
          'INVALID_PERIOD',
        ]),
      );
    }
  });

  it('returns explicit validation issues for legacy fields', () => {
    expect.assertions(3);
    try {
      validatePatientInput(
        {
          nik: 3171012304900003,
          fullName: 'A',
          birthDate: '2027-01-01',
          gender: 'UNKNOWN',
          phone: 'telepon',
        },
        new Date('2026-07-31T00:00:00.000Z'),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(PatientValidationError);
      const validationError = error as PatientValidationError;
      expect(validationError.issues.map((issue) => issue.field)).toEqual([
        'nik',
        'fullName',
        'birthDate',
        'gender',
        'phone',
      ]);
      expect(validationError.issues.map((issue) => issue.code)).toContain(
        'FUTURE_DATE',
      );
    }
  });
});
