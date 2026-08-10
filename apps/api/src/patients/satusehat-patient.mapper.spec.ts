import {
  PatientIdentifierType,
  VerificationStatus,
  type Patient,
} from '@mitrafaskes/shared';
import { PATIENT_IHS_SYSTEM } from './patient.constants';
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

  it('omits SATUSEHAT-unsupported Patient patch operations', () => {
    expect(toSatusehatPatientPatch(patient)).not.toContainEqual({
      op: 'replace',
      path: '/active',
      value: true,
    });
    expect(toSatusehatPatientPatch(patient)).not.toContainEqual(
      expect.objectContaining({ path: '/multipleBirthBoolean' }),
    );
    expect(toSatusehatPatientPatch({ ...patient, multipleBirthOrder: 2 })).not.toContainEqual(
      expect.objectContaining({ path: '/multipleBirthInteger' }),
    );
    expect(toSatusehatPatientPatch(patient)).not.toContainEqual({
      op: 'replace',
      path: '/telecom',
      value: [],
    });
    expect(toSatusehatPatientPatch(patient)).not.toContainEqual(
      expect.objectContaining({ path: '/deceasedBoolean' }),
    );
  });

  it('omits telecom replacement even when local telecom data exists', () => {
    const patientWithTelecom = {
      ...patient,
      telecoms: [
        {
          id: 'patient-telecom-1',
          system: 'PHONE' as const,
          value: '081234567890',
          normalizedValue: '081234567890',
          use: 'MOBILE' as const,
          rank: 1,
          verificationStatus: 'VERIFIED' as const,
          active: true,
        },
      ],
    };

    expect(toSatusehatPatientPatch(patientWithTelecom)).not.toContainEqual(
      expect.objectContaining({ path: '/telecom' }),
    );
  });

  it('sends only the canonical official name on Patient updates', () => {
    const patientWithAlias = {
      ...patient,
      names: [
        {
          id: 'patient-name-official',
          use: 'OFFICIAL' as const,
          text: 'Siti Sehat',
          family: '',
          given: [],
          prefix: [],
          suffix: [],
        },
        {
          id: 'patient-name-preferred',
          use: 'PREFERRED' as const,
          text: 'Siti',
          family: '',
          given: [],
          prefix: [],
          suffix: [],
        },
      ],
    };

    expect(toSatusehatPatientPatch(patientWithAlias)).toContainEqual({
      op: 'replace',
      path: '/name',
      value: [{ use: 'official', text: 'Siti Sehat' }],
    });
  });

  it('maps administrative address codes to the SATUSEHAT address extension', () => {
    const patientWithAddress = {
      ...patient,
      addresses: [
        {
          id: 'patient-address-1',
          use: 'HOME' as const,
          type: 'PHYSICAL' as const,
          lines: ['Jl. Melati No. 12'],
          countryCode: 'ID',
          provinceCode: '31',
          regencyCode: '3171',
          districtCode: '317101',
          villageCode: '3171011001',
          active: true,
        },
      ],
    };

    expect(toSatusehatPatientPayload(patientWithAddress).address).toEqual([
      expect.objectContaining({
        extension: [
          {
            url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode',
            extension: [
              { url: 'province', valueCode: '31' },
              { url: 'city', valueCode: '3171' },
              { url: 'district', valueCode: '317101' },
              { url: 'village', valueCode: '3171011001' },
            ],
          },
        ],
      }),
    ]);
  });

  it('does not send the local IHS resource id as a Patient identifier', () => {
    const patientWithIhs = {
      ...patient,
      identifiers: [
        {
          id: 'patient-identifier-ihs',
          type: PatientIdentifierType.OTHER,
          system: PATIENT_IHS_SYSTEM,
          value: 'P02280547535',
          normalizedValue: 'P02280547535',
          verificationStatus: VerificationStatus.UNVERIFIED,
          isPrimary: false,
          active: true,
        },
      ],
    };

    expect(toSatusehatPatientPayload(patientWithIhs).identifier).toEqual([
      {
        use: 'official',
        system: 'https://fhir.kemkes.go.id/id/nik',
        value: patient.nik,
      },
    ]);
  });
});
