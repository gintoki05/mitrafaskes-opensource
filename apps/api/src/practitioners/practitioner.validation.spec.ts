import { Gender } from '@prisma/client';
import {
  PractitionerValidationError,
  validatePractitionerCreate,
  validatePractitionerUpdate,
} from './practitioner.validation';

describe('Practitioner validation', () => {
  it('normalizes a valid local Practitioner create request', () => {
    expect(
      validatePractitionerCreate({
        username: 'dr_alexander',
        password: 'Temporary123!',
        fullName: 'dr. Alexander',
        role: 'DOKTER',
        nik: '7209061211900001',
        birthDate: '1994-01-01',
        gender: 'MALE',
        active: true,
      }),
    ).toEqual({
      username: 'dr_alexander',
      password: 'Temporary123!',
      fullName: 'dr. Alexander',
      role: 'DOKTER',
      nik: '7209061211900001',
      birthDate: new Date('1994-01-01T00:00:00.000Z'),
      gender: 'MALE',
      sipNumber: null,
      strNumber: null,
      organizationId: null,
      locationId: null,
      active: true,
    });
  });

  it('allows a local Practitioner without NIK before SATUSEHAT matching', () => {
    expect(
      validatePractitionerCreate({
        username: 'perawat_lokal',
        password: 'Temporary123!',
        fullName: 'Perawat Lokal',
        role: 'PERAWAT',
      }),
    ).toMatchObject({
      username: 'perawat_lokal',
      fullName: 'Perawat Lokal',
      role: 'PERAWAT',
      nik: null,
      active: true,
    });
  });

  it('normalizes a valid local profile update', () => {
    expect(
      validatePractitionerUpdate({
        nik: '7209061211900001',
        birthDate: '1994-01-01',
        gender: Gender.MALE,
        organizationId: 'organization-1',
        locationId: 'location-1',
        active: true,
      }),
    ).toEqual({
      nik: '7209061211900001',
      birthDate: new Date('1994-01-01T00:00:00.000Z'),
      gender: Gender.MALE,
      organizationId: 'organization-1',
      locationId: 'location-1',
      active: true,
    });
  });

  it('rejects malformed NIK and date values', () => {
    expect(() =>
      validatePractitionerUpdate({ nik: '123', birthDate: '2026-02-31' }),
    ).toThrow(PractitionerValidationError);
  });
});
