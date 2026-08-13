import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import {
  AddressType,
  AddressUse,
  Gender,
  Patient,
  PatientListQuery,
  PatientListResponse,
  PatientIdentifierType,
  PatientNameUse,
  PatientRelationshipCode,
  TelecomSystem,
  TelecomUse,
} from '@mitrafaskes/shared';
import {
  PatientIdentityConflictError,
  PatientRepository,
} from './../src/patients/patient.repository';
import { ValidatedPatientInput } from './../src/patients/patient.validation';
import { PatientAddressRegionValidator } from './../src/patients/patient-address-region.validator';
import { EncountersService } from './../src/encounters/encounters.service';
import { RmeService } from './../src/rme/rme.service';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

class InMemoryPatientRepository {
  private readonly patients: Patient[] = [];
  private sequence = 1;

  async findMany(input: PatientListQuery = {}): Promise<PatientListResponse> {
    const page = input.page ?? 1;
    const pageSize = Math.min(input.pageSize ?? 25, 100);
    const filteredPatients = this.patients.filter(
      (patient) => input.active === undefined || patient.active === input.active,
    );
    return {
      items: filteredPatients.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, total: filteredPatients.length },
      statusCounts: {
        active: this.patients.filter((patient) => patient.active !== false).length,
        inactive: this.patients.filter((patient) => patient.active === false).length,
      },
    };
  }

  async findById(id: string): Promise<Patient | null> {
    return this.patients.find((patient) => patient.id === id) ?? null;
  }

  async create(input: ValidatedPatientInput): Promise<Patient> {
    if (
      input.nik &&
      this.patients.some((patient) => patient.nik === input.nik)
    ) {
      throw new PatientIdentityConflictError('nik');
    }

    const timestamp = new Date('2026-07-31T00:00:00.000Z').toISOString();
    const patient: Patient = {
      id: `patient-${this.sequence}`,
      nik: input.nik,
      fullName: input.fullName,
      birthDate: input.birthDate.toISOString().slice(0, 10),
      gender: input.gender,
      address: input.address,
      phone: input.phone,
      medicalRecNo: `RM-2026-${String(this.sequence).padStart(6, '0')}`,
      integrations: [],
      active: input.active,
      birthPlaceText: input.birthPlaceText,
      multipleBirthOrder: input.multipleBirthOrder,
      deceasedAt: input.deceasedAt?.toISOString(),
      maritalStatusCode: input.maritalStatusCode,
      citizenshipCode: input.citizenshipCode,
      version: 1,
      identifiers: input.identifiers.map((identifier, index) => ({
        ...identifier,
        id: `identifier-${this.sequence}-${index}`,
        validFrom: identifier.validFrom?.toISOString(),
        validTo: identifier.validTo?.toISOString(),
      })),
      names: input.names.map((name, index) => ({
        ...name,
        id: `name-${this.sequence}-${index}`,
        validFrom: name.validFrom?.toISOString(),
        validTo: name.validTo?.toISOString(),
      })),
      telecoms: input.telecoms.map((telecom, index) => ({
        ...telecom,
        id: `telecom-${this.sequence}-${index}`,
        validFrom: telecom.validFrom?.toISOString(),
        validTo: telecom.validTo?.toISOString(),
      })),
      addresses: input.addresses.map((address, index) => ({
        ...address,
        id: `address-${this.sequence}-${index}`,
        validFrom: address.validFrom?.toISOString(),
        validTo: address.validTo?.toISOString(),
      })),
      relationships: input.relationships.map((relationship, index) => ({
        id: `relationship-${this.sequence}-${index}`,
        relationshipCode: relationship.relationshipCode,
        relatedPatientId: relationship.relatedPatientId,
        relatedPersonId: relationship.relatedPersonId,
        relatedPerson: relationship.relatedPerson
          ? {
              id: `related-person-${this.sequence}-${index}`,
              ...relationship.relatedPerson,
              birthDate: relationship.relatedPerson.birthDate
                ?.toISOString()
                .slice(0, 10),
            }
          : undefined,
        startAt: relationship.startAt?.toISOString(),
        endAt: relationship.endAt?.toISOString(),
        isGuardian: relationship.isGuardian,
        contactPriority: relationship.contactPriority,
        active: relationship.active,
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.sequence += 1;
    this.patients.push(patient);
    return patient;
  }
}

describe('Access control (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const patientRepository = new InMemoryPatientRepository();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PatientRepository)
      .useValue(patientRepository)
      .overrideProvider(PatientAddressRegionValidator)
      .useValue({
        canonicalize: jest.fn(async (addresses: unknown[]) => addresses),
      })
      .overrideProvider(EncountersService)
      .useValue({
        findMany: jest.fn().mockResolvedValue({
          items: [],
          meta: { page: 2, pageSize: 1, total: 0 },
        }),
        create: jest.fn().mockResolvedValue({ id: 'enc-test-1' }),
        updateStatus: jest.fn().mockResolvedValue({ id: 'enc-test-1' }),
      })
      .overrideProvider(RmeService)
      .useValue({
        findByEncounterId: jest.fn().mockResolvedValue(null),
        saveDraft: jest.fn().mockResolvedValue({ id: 'rme-test-1', status: 'DRAFT' }),
        finalize: jest.fn().mockResolvedValue({ id: 'rme-test-1', status: 'FINAL' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows the public login endpoint and returns a reusable session token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'dr_budi', password: 'dok123' })
      .expect(201);

    expect(response.body.accessToken).toBe('mock-jwt-token-dr_budi');
    expect(response.body.user.role).toBe('DOKTER');
  });

  it('rejects protected endpoints without a session', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/patients')
      .expect(401);

    expect(response.body.code).toBe('UNAUTHENTICATED');
  });

  it('allows a role to use its permitted endpoint', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rme/encounter/enc-001')
      .set(bearer('mock-jwt-token-dr_budi'))
      .expect(200);

    expect(response.status).toBe(200);
  });

  it('returns server-side pagination metadata for collection endpoints', async () => {
    const encounters = await request(app.getHttpServer())
      .get('/api/encounters?page=2&pageSize=1')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .expect(200);

    expect(encounters.body.meta).toEqual({ page: 2, pageSize: 1, total: 0 });
    expect(encounters.body.items).toHaveLength(0);

    const patients = await request(app.getHttpServer())
      .get('/api/patients?page=1&pageSize=1')
      .set(bearer('mock-jwt-token-admin'))
      .expect(200);

    expect(patients.body.meta).toEqual({ page: 1, pageSize: 1, total: 0 });
    expect(patients.body.items).toEqual([]);

    const capabilities = await request(app.getHttpServer())
      .get('/api/integrations/capabilities')
      .set(bearer('mock-jwt-token-admin'))
      .expect(200);

    expect(capabilities.body.integrations).toEqual([
      expect.objectContaining({ provider: 'SATUSEHAT', enabled: false, status: 'DISABLED' }),
    ]);

    const logs = await request(app.getHttpServer())
      .get('/api/integrations/SATUSEHAT/logs?page=1&pageSize=1')
      .set(bearer('mock-jwt-token-admin'))
      .expect(503);

    expect(logs.body.code).toBe('INTEGRATION_DISABLED');

    const connection = await request(app.getHttpServer())
      .get('/api/integrations/SATUSEHAT/connection')
      .set(bearer('mock-jwt-token-admin'))
      .expect(503);

    expect(connection.body.code).toBe('INTEGRATION_DISABLED');

    const conditionSync = await request(app.getHttpServer())
      .post('/api/integrations/SATUSEHAT/resources/Condition/diagnosis-1/sync')
      .set(bearer('mock-jwt-token-admin'))
      .expect(503);

    expect(conditionSync.body.code).toBe('INTEGRATION_DISABLED');
  });

  it('returns 403 when an authenticated role bypasses the UI', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send({ nik: '3171012304900003', fullName: 'Tidak Boleh Dibuat' })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('enforces the Encounter lifecycle permission matrix at the API boundary', async () => {
    await request(app.getHttpServer())
      .post('/api/encounters')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .send({ patientId: 'patient-1', locationId: 'location-1', doctorId: 'doctor-1' })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/encounters/enc-test-1/status')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .send({ status: 'CANCELLED', expectedVersion: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/encounters/enc-test-1/status')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send({ status: 'IN_PROGRESS', expectedVersion: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/encounters/enc-test-1/status')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send({ status: 'COMPLETED', expectedVersion: 1 })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/encounters')
      .set(bearer('mock-jwt-token-admin'))
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/encounters/enc-test-1/status')
      .set(bearer('mock-jwt-token-admin'))
      .send({ status: 'CANCELLED', expectedVersion: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/encounters')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send({ patientId: 'patient-1', locationId: 'location-1', doctorId: 'doctor-1' })
      .expect(403);

    await request(app.getHttpServer())
      .patch('/api/encounters/enc-test-1/status')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .send({ status: 'COMPLETED', expectedVersion: 1 })
      .expect(400);
  });

  it('separates draft and finalize permissions at the API boundary', async () => {
    const command = { encounterId: 'enc-test-1', expectedVersion: 0 };

    await request(app.getHttpServer())
      .post('/api/rme/draft')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send({ ...command, diagnoses: [], prescriptions: [] })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/rme/finalize')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send(command)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/rme/draft')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .send(command)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/rme/finalize')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .send(command)
      .expect(403);
  });

  it('normalizes NIK and allocates unique medical record numbers', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-admin'))
      .send({
        nik: '3171-0123 0490.0003',
        fullName: '  Dewi   Lestari ',
        birthDate: '1990-04-23',
        gender: 'female',
        phone: '(0812) 3456-7890',
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-admin'))
      .send({
        fullName: 'Bayi Ny. Sari',
        birthDate: '2026-07-31',
        gender: 'FEMALE',
      })
      .expect(201);

    expect(first.body.nik).toBe('3171012304900003');
    expect(first.body.fullName).toBe('Dewi Lestari');
    expect(first.body.phone).toBe('081234567890');
    expect(first.body.medicalRecNo).not.toBe(second.body.medicalRecNo);
  });

  it('returns explicit NIK conflict and validation errors', async () => {
    const patient = {
      nik: '3171012304900003',
      fullName: 'Dewi Lestari',
      birthDate: '1990-04-23',
      gender: 'FEMALE',
    };

    await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-admin'))
      .send(patient)
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-admin'))
      .send({ ...patient, nik: '3171-0123-0490-0003' })
      .expect(409);
    expect(conflict.body.code).toBe('NIK_ALREADY_EXISTS');

    const invalid = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-admin'))
      .send({ nik: '123', fullName: '', birthDate: '31-07-2026' })
      .expect(400);
    expect(invalid.body.code).toBe('PATIENT_VALIDATION_FAILED');
    expect(invalid.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'nik' }),
        expect.objectContaining({ field: 'birthDate' }),
        expect.objectContaining({ field: 'gender' }),
      ]),
    );
  });

  it('allows registration staff to create structured multi-value patient data atomically', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .send({
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
          { use: PatientNameUse.ALIAS, text: 'Bayi A' },
          {
            use: PatientNameUse.OLD,
            text: 'Bayi Belum Bernama',
            validTo: '2026-07-30T00:00:00.000Z',
          },
        ],
        telecoms: [
          {
            system: TelecomSystem.PHONE,
            use: TelecomUse.MOBILE,
            value: '0812-1111-2222',
          },
          {
            system: TelecomSystem.EMAIL,
            use: TelecomUse.HOME,
            value: 'keluarga@example.test',
            rank: 2,
          },
        ],
        addresses: [
          {
            use: AddressUse.HOME,
            type: AddressType.BOTH,
            text: 'Jl. Mawar 1',
            lines: ['Jl. Mawar 1'],
            countryCode: 'ID',
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
            text: 'Jl. Lama 2',
            active: false,
          },
        ],
        relationships: [
          {
            relationshipCode: PatientRelationshipCode.GUARDIAN,
            relatedPerson: {
              fullName: 'Rina Wulandari',
              phone: '081355556666',
            },
          },
        ],
      })
      .expect(201);

    expect(response.body.nik).toBeUndefined();
    expect(response.body.identifiers).toEqual([
      expect.objectContaining({
        type: PatientIdentifierType.MOTHER_NIK,
        normalizedValue: '3171012304900003',
      }),
    ]);
    expect(response.body.names).toHaveLength(3);
    expect(response.body.telecoms).toHaveLength(2);
    expect(response.body.addresses).toHaveLength(2);
    expect(response.body.relationships).toEqual([
      expect.objectContaining({
        relationshipCode: PatientRelationshipCode.GUARDIAN,
        isGuardian: true,
      }),
    ]);
    expect(response.body).toEqual(
      expect.objectContaining({
        fullName: 'Bayi Ny. Sari',
        medicalRecNo: expect.stringMatching(/^RM-2026-/),
      }),
    );
  });

  it('returns a disabled response for direct SATUSEHAT access when the plugin is off', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/integrations/SATUSEHAT/logs')
      .set(bearer('mock-jwt-token-admin'))
      .expect(503);

    expect(response.body.code).toBe('INTEGRATION_DISABLED');
  });
});
