import type { Patient } from '@mitrafaskes/shared';
import {
  toSatusehatPatientPatch,
  toSatusehatPatientPayload,
} from './satusehat-patient.mapper';

const patient: Patient = {
  id: 'patient-local-1',
  nik: '7209061211900001',
  fullName: 'Siti Sehat',
  birthDate: '1990-01-01',
  gender: 'FEMALE' as Patient['gender'],
  medicalRecNo: 'RM-0001',
  active: true,
  identifiers: [],
  names: [],
  telecoms: [],
  addresses: [],
  relationships: [],
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

describe('SATUSEHAT Patient mapper', () => {
  it('marks a non-twin Patient with multipleBirthBoolean false', () => {
    expect(toSatusehatPatientPayload(patient)).toEqual(
      expect.objectContaining({
        multipleBirthBoolean: false,
      }),
    );
    expect(toSatusehatPatientPayload(patient)).not.toHaveProperty(
      'multipleBirthInteger',
    );
  });

  it('maps a twin birth order to multipleBirthInteger', () => {
    const twinPatient = { ...patient, multipleBirthOrder: 2 };

    expect(toSatusehatPatientPayload(twinPatient)).toEqual(
      expect.objectContaining({
        multipleBirthInteger: 2,
      }),
    );
    expect(toSatusehatPatientPayload(twinPatient)).not.toHaveProperty(
      'multipleBirthBoolean',
    );
  });

  it('includes the matching multiple birth choice in Patient patches', () => {
    expect(toSatusehatPatientPatch(patient)).toContainEqual({
      op: 'replace',
      path: '/multipleBirthBoolean',
      value: false,
    });
    expect(toSatusehatPatientPatch({ ...patient, multipleBirthOrder: 2 })).toContainEqual({
      op: 'replace',
      path: '/multipleBirthInteger',
      value: 2,
    });
  });
});
