import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Access control (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    const response = await request(app.getHttpServer()).get('/api/patients').expect(401);

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
