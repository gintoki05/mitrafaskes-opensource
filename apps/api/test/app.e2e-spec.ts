import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Patient } from '@mitrafaskes/shared';
import {
  PatientIdentityConflictError,
  PatientRepository,
} from './../src/patients/patient.repository';
import { ValidatedPatientInput } from './../src/patients/patient.validation';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

class InMemoryPatientRepository {
  private readonly patients: Patient[] = [];
  private sequence = 1;

  async findMany(): Promise<Patient[]> {
    return [...this.patients];
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

  it('returns 403 when an authenticated role bypasses the UI', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/patients')
      .set(bearer('mock-jwt-token-dr_budi'))
      .send({ nik: '3171012304900003', fullName: 'Tidak Boleh Dibuat' })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
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

  it('keeps raw SATUSEHAT payloads restricted to admins', async () => {
    const registrationResponse = await request(app.getHttpServer())
      .get('/api/satusehat/logs')
      .set(bearer('mock-jwt-token-perawat_ani'))
      .expect(200);
    expect(registrationResponse.body[0].payload).toBeUndefined();

    const adminResponse = await request(app.getHttpServer())
      .get('/api/satusehat/logs')
      .set(bearer('mock-jwt-token-admin'))
      .expect(200);
    expect(adminResponse.body[0].payload).toBeDefined();
  });
});
