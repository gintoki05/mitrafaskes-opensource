import { Gender } from '@mitrafaskes/shared';
import {
  PatientValidationError,
  normalizeNik,
  validatePatientInput,
} from './patient.validation';

describe('patient validation', () => {
  it('normalizes NIK separators and patient text', () => {
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

    expect(patient).toEqual({
      nik: '3171012304900003',
      fullName: 'Dewi Lestari',
      birthDate: new Date('1990-04-23T00:00:00.000Z'),
      gender: Gender.FEMALE,
      phone: '081234567890',
      address: 'Jl. Merdeka 10',
    });
    expect(normalizeNik(' 3171 0123 0490 0003 ')).toBe('3171012304900003');
  });

  it('allows a patient without NIK', () => {
    const patient = validatePatientInput({
      fullName: 'Bayi Ny. Sari',
      birthDate: '2026-07-31',
      gender: Gender.FEMALE,
    });

    expect(patient.nik).toBeUndefined();
  });

  it('returns explicit validation issues', () => {
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
