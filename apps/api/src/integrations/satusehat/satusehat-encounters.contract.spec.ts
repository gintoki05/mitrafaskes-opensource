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

const inProgressEncounter = (): EncounterWithRelations => {
  const encounter = completedEncounter();
  const startedAt = encounter.startedAt!;
  return {
    ...encounter,
    status: EncounterStatus.IN_PROGRESS,
    completedAt: null,
    cancelledAt: null,
    version: 2,
    updatedAt: startedAt,
    statusHistory: [
      {
        ...encounter.statusHistory[0],
        periodEnd: startedAt,
      },
      {
        ...encounter.statusHistory[1],
        periodEnd: null,
        createdAt: startedAt,
      },
    ],
  };
};

const cancelledEncounter = (): EncounterWithRelations => {
  const encounter = completedEncounter();
  const cancelledAt = new Date('2026-08-12T01:10:00.000Z');

  return {
    ...encounter,
    status: EncounterStatus.CANCELLED,
    startedAt: null,
    completedAt: null,
    cancelledAt,
    version: 2,
    updatedAt: cancelledAt,
    statusHistory: [
      {
        ...encounter.statusHistory[0],
        periodEnd: cancelledAt,
      },
      {
        ...encounter.statusHistory[0],
        id: 'history-cancelled',
        status: EncounterStatus.CANCELLED,
        periodStart: cancelledAt,
        periodEnd: null,
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
      diagnoses: [
        {
          externalResourceId: 'condition-remote-primary',
          display: 'Essential hypertension',
          rank: 1,
        },
      ],
    });

    expect(payload).toEqual(fixture('valid'));
    expect(validateSatusehatEncounterPayload(payload)).toEqual([]);
  });

  it('maps a cancelled local lifecycle to a valid SATUSEHAT terminal Encounter', () => {
    const payload = toSatusehatEncounterPayload(cancelledEncounter(), {
      organizationExternalId: dependencies.Organization,
      locationExternalId: dependencies.Location,
      patientExternalId: dependencies.Patient,
      practitionerExternalId: dependencies.Practitioner,
    });

    expect(payload.status).toBe('cancelled');
    expect(payload.period.end).toBe('2026-08-12T01:10:00.000Z');
    expect(payload.statusHistory.at(-1)).toEqual({
      status: 'cancelled',
      period: {
        start: '2026-08-12T01:10:00.000Z',
        end: '2026-08-12T01:10:00.000Z',
      },
    });
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
      diagnoses: [
        {
          externalResourceId: 'condition-remote-primary',
          display: 'Essential hypertension',
          rank: 1,
        },
      ],
    });

    expect(payload.id).toBe('encounter-remote-42');
  });

  it('rejects a finished payload whose history has the lifecycle statuses out of order', () => {
    const payload = toSatusehatEncounterPayload(completedEncounter(), {
      organizationExternalId: dependencies.Organization,
      locationExternalId: dependencies.Location,
      patientExternalId: dependencies.Patient,
      practitionerExternalId: dependencies.Practitioner,
      diagnoses: [
        {
          externalResourceId: 'condition-remote-primary',
          display: 'Essential hypertension',
          rank: 1,
        },
      ],
    });

    const issues = validateSatusehatEncounterPayload({
      ...payload,
      statusHistory: [
        payload.statusHistory[1],
        payload.statusHistory[0],
        payload.statusHistory[2],
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'statusHistory' }),
      ]),
    );
  });

  it('requires a diagnosis reference when the payload is finished', () => {
    const payload = { ...(fixture('valid') as Record<string, unknown>) };
    delete payload.diagnosis;

    const issues = validateSatusehatEncounterPayload(payload);

    expect(issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'diagnosis' })]),
    );
  });

  it('projects linked Conditions with admission diagnosis use and deterministic ranks', () => {
    const payload = toSatusehatEncounterPayload(completedEncounter(), {
      organizationExternalId: dependencies.Organization,
      locationExternalId: dependencies.Location,
      patientExternalId: dependencies.Patient,
      practitionerExternalId: dependencies.Practitioner,
      diagnoses: [
        {
          externalResourceId: 'condition-remote-primary',
          display: 'Essential hypertension',
          rank: 1,
        },
        {
          externalResourceId: 'condition-remote-secondary',
          display: 'Acute URI',
          rank: 2,
        },
      ],
    });

    expect(payload.diagnosis).toEqual([
      {
        condition: {
          reference: 'Condition/condition-remote-primary',
          display: 'Essential hypertension',
        },
        use: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
              code: 'AD',
              display: 'Admission diagnosis',
            },
          ],
        },
        rank: 1,
      },
      {
        condition: {
          reference: 'Condition/condition-remote-secondary',
          display: 'Acute URI',
        },
        use: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
              code: 'AD',
              display: 'Admission diagnosis',
            },
          ],
        },
        rank: 2,
      },
    ]);
    expect(validateSatusehatEncounterPayload(payload)).toEqual([]);
  });
});

describe('SatusehatEncounterService preview', () => {
  const buildService = (
    missing?: keyof typeof dependencies,
    encounterExternalId?: string,
    encounter: EncounterWithRelations = completedEncounter(),
    diagnosisRows: Array<{
      id: string;
      isPrimary: boolean;
      icd10Code: string;
    }> = [{ id: 'diagnosis-primary', isPrimary: true, icd10Code: 'I10' }],
    conditionLinks: Array<{
      localResourceId: string;
      externalResourceId: string;
    }> = [
      {
        localResourceId: 'diagnosis-primary',
        externalResourceId: 'condition-remote-primary',
      },
    ],
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
    const findConditionLinks = jest.fn(({ where }) => {
      const requestedIds = where.localResourceId?.in ?? [];
      return Promise.resolve(
        conditionLinks.filter((link) =>
          requestedIds.includes(link.localResourceId),
        ),
      );
    });
    const syncLogCreate = jest.fn();
    const medicalRecordFindUnique = jest
      .fn()
      .mockResolvedValue({ status: 'FINAL' });
    const locationFindUnique = jest.fn().mockResolvedValue({
      organizationId: 'organization-local-1',
    });
    const prisma = {
      diagnosis: {
        findMany: jest.fn().mockResolvedValue(diagnosisRows),
      },
      masterIcd10: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { code: 'I10', display: 'Essential hypertension' },
          ]),
      },
      externalResourceLink: {
        findUnique,
        findMany: findConditionLinks,
      },
      satusehatSyncLog: { create: syncLogCreate },
      medicalRecord: {
        findUnique: medicalRecordFindUnique,
      },
      location: {
        findUnique: locationFindUnique,
      },
    };
    const encounters = {
      findById: jest.fn().mockResolvedValue(encounter),
    };
    return {
      service: new SatusehatEncounterPreflightService(
        prisma as never,
        encounters as never,
      ),
      findUnique,
      syncLogCreate,
      locationFindUnique,
      medicalRecordFindUnique,
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

  it('allows an in-progress Encounter preview before any Condition is linked', async () => {
    const { service } = buildService(
      undefined,
      undefined,
      inProgressEncounter(),
      [],
      [],
    );

    const preview = await service.previewEncounter('enc-local-42');

    expect(preview.payload.status).toBe('in-progress');
    expect(preview.payload.diagnosis).toBeUndefined();
  });

  it('projects an unlinked completed Encounter as historical in-progress for recovery', async () => {
    const { service } = buildService(
      undefined,
      undefined,
      completedEncounter(),
      [{ id: 'diagnosis-primary', isPrimary: true, icd10Code: 'I10' }],
      [],
    );

    const preview = await service.prepareHistoricalInProgressPreview(
      'enc-local-42',
      'sandbox',
    );

    expect(preview.operation).toBe('CREATE');
    expect(preview.payload.status).toBe('in-progress');
    expect(preview.payload.period.end).toBeUndefined();
    expect(preview.payload.diagnosis).toBeUndefined();
    expect(preview.payload.statusHistory.map((entry) => entry.status)).toEqual([
      'arrived',
      'in-progress',
    ]);
    expect(preview.payload.statusHistory.at(-1)?.period.end).toBeUndefined();
    expect(validateSatusehatEncounterPayload(preview.payload)).toEqual([]);
  });

  it('refuses historical recovery when an Encounter linkage already exists', async () => {
    const { service } = buildService(
      undefined,
      'encounter-remote-42',
      completedEncounter(),
    );

    await expect(
      service.prepareHistoricalInProgressPreview('enc-local-42', 'sandbox'),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'SATUSEHAT_ENCOUNTER_RECOVERY_ALREADY_LINKED',
      }),
    });
  });

  it('refuses historical recovery while the local RME is not final', async () => {
    const { service, medicalRecordFindUnique } = buildService(
      undefined,
      undefined,
      completedEncounter(),
    );
    medicalRecordFindUnique.mockResolvedValue({ status: 'DRAFT' });

    await expect(
      service.prepareHistoricalInProgressPreview('enc-local-42', 'sandbox'),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'SATUSEHAT_ENCOUNTER_RECOVERY_FINAL_RME_REQUIRED',
      }),
    });
  });

  it('blocks a finished Encounter when the primary Condition is not linked', async () => {
    const { service } = buildService(
      undefined,
      undefined,
      completedEncounter(),
      [{ id: 'diagnosis-primary', isPrimary: true, icd10Code: 'I10' }],
      [],
    );

    await expect(
      service.previewEncounter('enc-local-42'),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'SATUSEHAT_ENCOUNTER_PRIMARY_CONDITION_REQUIRED',
        dependencies: ['Condition'],
        message: expect.stringContaining('diagnosis utama Condition'),
      }),
    });
  });

  it('keeps primary rank 1 and secondary rank 2 regardless of local row order', async () => {
    const { service } = buildService(
      undefined,
      undefined,
      completedEncounter(),
      [
        { id: 'diagnosis-secondary', isPrimary: false, icd10Code: 'J00' },
        { id: 'diagnosis-primary', isPrimary: true, icd10Code: 'I10' },
      ],
      [
        {
          localResourceId: 'diagnosis-secondary',
          externalResourceId: 'condition-remote-secondary',
        },
        {
          localResourceId: 'diagnosis-primary',
          externalResourceId: 'condition-remote-primary',
        },
      ],
    );

    const preview = await service.previewEncounter('enc-local-42');

    expect(
      preview.payload.diagnosis?.map((diagnosis) => ({
        reference: diagnosis.condition.reference,
        rank: diagnosis.rank,
      })),
    ).toEqual([
      { reference: 'Condition/condition-remote-primary', rank: 1 },
      { reference: 'Condition/condition-remote-secondary', rank: 2 },
    ]);
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
