import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictException } from '@nestjs/common';
import { EncounterStatus, Role } from '@prisma/client';
import type { EncounterWithRelations } from '../../encounters/encounter.repository';
import { validateSatusehatEncounterPayload } from './satusehat-encounter.contract';
import { toSatusehatEncounterPayload } from './satusehat-encounter.mapper';
import { SatusehatEncounterPreflightService } from './satusehat-encounter-preflight.service';

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(join(__dirname, 'fixtures', `encounter-${name}.json`), 'utf8'),
  );

const completedEncounter = (): EncounterWithRelations => {
  const arrivedAt = new Date('2026-08-12T01:00:00.000Z');
  const startedAt = new Date('2026-08-12T01:15:00.000Z');
  const completedAt = new Date('2026-08-12T02:00:00.000Z');
  return {
    id: 'enc-local-42',
    encounterNumber: 'ENC-2026-000042',
    patientId: 'patient-local-1',
    doctorId: 'practitioner-local-1',
    organizationId: 'organization-local-1',
    locationId: 'location-local-1',
    queueDate: new Date('2026-08-12T00:00:00.000Z'),
    queueNumber: 42,
    status: EncounterStatus.COMPLETED,
    arrivedAt,
    startedAt,
    completedAt,
    cancelledAt: null,
    version: 3,
    createdAt: arrivedAt,
    updatedAt: completedAt,
    patient: {
      id: 'patient-local-1',
      nik: '3173000000000001',
      fullName: 'Budi Santoso',
      medicalRecNo: 'RM-2026-000001',
    },
    doctor: {
      id: 'practitioner-local-1',
      fullName: 'dr. Bronsig',
      sipNumber: 'SIP-001',
    },
    organization: {
      id: 'organization-local-1',
      code: 'ORG-001',
      name: 'Klinik Mitra Sehat',
    },
    location: {
      id: 'location-local-1',
      code: 'POLI-UMUM',
      name: 'Poli Umum',
    },
    statusHistory: [
      {
        id: 'history-arrived',
        encounterId: 'enc-local-42',
        status: EncounterStatus.WAITING,
        periodStart: arrivedAt,
        periodEnd: startedAt,
        actorUserId: 'user-1',
        actorUsername: 'admin',
        actorRole: Role.ADMIN_FASKES,
        createdAt: arrivedAt,
      },
      {
        id: 'history-progress',
        encounterId: 'enc-local-42',
        status: EncounterStatus.IN_PROGRESS,
        periodStart: startedAt,
        periodEnd: completedAt,
        actorUserId: 'user-2',
        actorUsername: 'doctor',
        actorRole: Role.DOKTER,
        createdAt: startedAt,
      },
      {
        id: 'history-finished',
        encounterId: 'enc-local-42',
        status: EncounterStatus.COMPLETED,
        periodStart: completedAt,
        periodEnd: null,
        actorUserId: 'user-2',
        actorUsername: 'doctor',
        actorRole: Role.DOKTER,
        createdAt: completedAt,
      },
    ],
  };
};

const dependencies = {
  Organization: '10000004',
  Location: '408ba28c-3115-4df5-85c6-60f15b44e7fa',
  Patient: '100000030009',
  Practitioner: 'N10000001',
} as const;

describe('SATUSEHAT Encounter payload contract', () => {
  it('maps a completed local lifecycle to the golden fixture', () => {
    const payload = toSatusehatEncounterPayload(completedEncounter(), {
      organizationExternalId: dependencies.Organization,
      locationExternalId: dependencies.Location,
      patientExternalId: dependencies.Patient,
      practitionerExternalId: dependencies.Practitioner,
    });

    expect(payload).toEqual(fixture('valid'));
    expect(validateSatusehatEncounterPayload(payload)).toEqual([]);
  });

  it('rejects the invalid fixture for namespace, status, class history, and UTC', () => {
    const paths = validateSatusehatEncounterPayload(fixture('invalid')).map(
      (issue) => issue.path,
    );

    expect(paths).toEqual(
      expect.arrayContaining([
        'identifier[0].system',
        'status',
        'statusHistory[0].period.start',
        'classHistory',
        'period.start',
      ]),
    );
  });

  it('adds the remote id only for an update preview', () => {
    const payload = toSatusehatEncounterPayload(completedEncounter(), {
      organizationExternalId: dependencies.Organization,
      locationExternalId: dependencies.Location,
      patientExternalId: dependencies.Patient,
      practitionerExternalId: dependencies.Practitioner,
      encounterExternalId: 'encounter-remote-42',
    });

    expect(payload.id).toBe('encounter-remote-42');
  });
});

describe('SatusehatEncounterService preview', () => {
  const buildService = (
    missing?: keyof typeof dependencies,
    encounterExternalId?: string,
  ) => {
    const findUnique = jest.fn(({ where }) => {
      const scope = where.localResourceScope;
      if (scope.resourceType === 'Encounter') {
        return Promise.resolve(
          encounterExternalId
            ? { externalResourceId: encounterExternalId }
            : null,
        );
      }
      if (scope.resourceType === missing) return Promise.resolve(null);
      return Promise.resolve({
        externalResourceId:
          dependencies[scope.resourceType as keyof typeof dependencies],
      });
    });
    const syncLogCreate = jest.fn();
    const locationFindUnique = jest.fn().mockResolvedValue({
      organizationId: 'organization-local-1',
    });
    const prisma = {
      externalResourceLink: { findUnique },
      satusehatSyncLog: { create: syncLogCreate },
      location: {
        findUnique: locationFindUnique,
      },
    };
    const encounters = {
      findById: jest.fn().mockResolvedValue(completedEncounter()),
    };
    return {
      service: new SatusehatEncounterPreflightService(
        prisma as never,
        encounters as never,
      ),
      findUnique,
      syncLogCreate,
      locationFindUnique,
    };
  };

  it('uses the contract mapper for CREATE without network or sync-log writes', async () => {
    const { service, syncLogCreate, findUnique } = buildService();
    const fetchSpy = jest.spyOn(global, 'fetch');

    const preview = await service.previewEncounter('enc-local-42');

    expect(preview.operation).toBe('CREATE');
    expect(preview.payload).toEqual(fixture('valid'));
    expect(syncLogCreate).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(findUnique).toHaveBeenCalledTimes(5);
    for (const [input] of findUnique.mock.calls) {
      expect(input.where.localResourceScope).toEqual(
        expect.objectContaining({
          provider: 'SATUSEHAT',
          environment: 'sandbox',
        }),
      );
    }
    fetchSpy.mockRestore();
  });

  it('uses the existing generic Encounter linkage for UPDATE', async () => {
    const { service } = buildService(undefined, 'encounter-remote-42');

    const preview = await service.previewEncounter('enc-local-42');

    expect(preview.operation).toBe('UPDATE');
    expect(preview.externalResourceId).toBe('encounter-remote-42');
    expect(preview.payload.id).toBe('encounter-remote-42');
  });

  it.each(Object.keys(dependencies) as Array<keyof typeof dependencies>)(
    'blocks preview when %s has no linkage',
    async (missing) => {
      const { service, syncLogCreate } = buildService(missing);

      await expect(
        service.previewEncounter('enc-local-42'),
      ).rejects.toMatchObject({
        constructor: ConflictException,
        response: expect.objectContaining({
          code: 'SATUSEHAT_ENCOUNTER_DEPENDENCY_MISSING',
          dependencies: [missing],
        }),
      });
      expect(syncLogCreate).not.toHaveBeenCalled();
    },
  );

  it('blocks preview when Location belongs to a different local Organization', async () => {
    const { service, locationFindUnique } = buildService();
    locationFindUnique.mockResolvedValue({
      organizationId: 'organization-local-other',
    });

    await expect(
      service.previewEncounter('enc-local-42'),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'SATUSEHAT_ENCOUNTER_LOCATION_ORGANIZATION_MISMATCH',
      }),
    });
  });
});
