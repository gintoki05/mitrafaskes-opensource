import { Role, LocationStatus } from '@prisma/client';
import { EncounterStatus } from '@mitrafaskes/shared';
import type { PrismaService } from '../database/prisma.service';
import { EncountersService } from './encounters.service';

const now = new Date('2026-08-10T02:00:00.000Z');

function encounterRecord(status = EncounterStatus.WAITING) {
  return {
    id: 'enc-local-1',
    encounterNumber: 'ENC-2026-000001',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    organizationId: 'organization-1',
    locationId: 'location-1',
    queueDate: new Date('2026-08-10T00:00:00.000Z'),
    queueNumber: 1,
    status,
    arrivedAt: now,
    startedAt: status === EncounterStatus.IN_PROGRESS ? now : null,
    completedAt: status === EncounterStatus.COMPLETED ? now : null,
    cancelledAt: status === EncounterStatus.CANCELLED ? now : null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    patient: {
      id: 'patient-1',
      nik: '3171012304900001',
      fullName: 'Ahmad Supardi',
      medicalRecNo: 'RM-2026-000001',
    },
    doctor: {
      id: 'doctor-1',
      fullName: 'dr. Budi Santoso',
      sipNumber: 'SIP-1',
    },
    organization: {
      id: 'organization-1',
      code: 'FASKES-1',
      name: 'Klinik Demo',
    },
    location: {
      id: 'location-1',
      code: 'POLI-UMUM',
      name: 'Poli Umum',
    },
    statusHistory: [
      {
        id: 'history-1',
        status,
        periodStart: now,
        periodEnd: null,
        actorUserId: 'user-1',
        actorUsername: 'perawat_ani',
        actorRole: Role.PERAWAT,
        createdAt: now,
      },
    ],
  };
}

function createService() {
  const record = encounterRecord();
  const transaction = {
    patient: {
      findUnique: jest.fn().mockResolvedValue({ id: 'patient-1', active: true }),
    },
    location: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'location-1',
        organizationId: 'organization-1',
        active: true,
        status: LocationStatus.ACTIVE,
        organization: { id: 'organization-1', active: true },
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'doctor-1',
        organizationId: 'organization-1',
        locationId: 'location-1',
        active: true,
        role: Role.DOKTER,
      }),
    },
    encounter: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(record),
      findUnique: jest.fn().mockResolvedValue(record),
    },
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{ lastIssuedNumber: 1 }])
      .mockResolvedValueOnce([{ value: 1n }]),
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    encounter: { findUnique: jest.fn().mockResolvedValue(record) },
    $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  } as unknown as PrismaService;
  const service = new EncountersService(prisma);
  return { service, prisma, transaction, record };
}

describe('EncountersService', () => {
  it('creates the local Encounter atomically without SATUSEHAT calls or logs', async () => {
    const { service, transaction } = createService();

    const result = await service.create(
      { patientId: 'patient-1', locationId: 'location-1', doctorId: 'doctor-1' },
      { id: 'user-1', username: 'perawat_ani', role: 'PERAWAT' },
    );

    expect(result.encounterNumber).toBe('ENC-2026-000001');
    expect(result.queueNumber).toBe(1);
    expect(result.status).toBe(EncounterStatus.WAITING);
    expect(transaction.encounter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          encounterNumber: 'ENC-2026-000001',
          queueNumber: 1,
          status: EncounterStatus.WAITING,
        }),
      }),
    );
  });

  it('closes history, snapshots the actor, and increments lifecycle version atomically', async () => {
    const current = encounterRecord(EncounterStatus.WAITING);
    const updated = {
      ...encounterRecord(EncounterStatus.IN_PROGRESS),
      version: 2,
    };
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([
        { id: current.id, status: EncounterStatus.WAITING, version: 1 },
      ]),
      encounter: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(updated),
      },
      encounterStatusHistory: {
        findFirst: jest.fn().mockResolvedValue(current.statusHistory[0]),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-db-1' }) },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const service = new EncountersService(
      prisma,
      {
        findForList: jest.fn(),
        findDependencyLink: jest.fn(),
        toLinkage: jest.fn(),
        toSyncSummary: jest.fn(),
      } as never,
    );

    const result = await service.updateStatus(
      current.id,
      { status: EncounterStatus.IN_PROGRESS, expectedVersion: 1 },
      { id: 'session-user-1', username: 'perawat_ani', role: 'PERAWAT' },
    );

    expect(result.version).toBe(2);
    expect(result.status).toBe(EncounterStatus.IN_PROGRESS);
    expect(transaction.encounterStatusHistory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'history-1' },
        data: { periodEnd: expect.any(Date) },
      }),
    );
    expect(transaction.encounter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EncounterStatus.IN_PROGRESS,
          version: { increment: 1 },
          startedAt: expect.any(Date),
        }),
      }),
    );
    expect(transaction.encounterStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EncounterStatus.IN_PROGRESS,
          actorUserId: 'user-db-1',
          actorUsername: 'perawat_ani',
          actorRole: Role.PERAWAT,
          periodStart: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects a stale version before mutating status or history', async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([
        { id: 'enc-local-1', status: EncounterStatus.WAITING, version: 2 },
      ]),
      encounter: { update: jest.fn() },
      encounterStatusHistory: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-db-1' }) },
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    } as unknown as PrismaService;
    const service = new EncountersService(
      prisma,
      { findForList: jest.fn() } as never,
    );

    await expect(
      service.updateStatus(
        'enc-local-1',
        { status: EncounterStatus.IN_PROGRESS, expectedVersion: 1 },
        { id: 'session-user-1', username: 'perawat_ani', role: 'PERAWAT' },
      ),
    ).rejects.toMatchObject({ code: 'ENCOUNTER_VERSION_CONFLICT' });
    expect(transaction.encounter.update).not.toHaveBeenCalled();
    expect(transaction.encounterStatusHistory.create).not.toHaveBeenCalled();
  });
});
