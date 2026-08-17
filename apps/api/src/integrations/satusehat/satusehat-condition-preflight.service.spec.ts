import { ConflictException } from '@nestjs/common';
import { SatusehatConditionPreflightService } from './satusehat-condition-preflight.service';

const diagnosisId = 'diagnosis-primary';
const encounterId = 'encounter-local-1';

function diagnosisRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: diagnosisId,
    icd10Code: 'I10',
    isPrimary: true,
    icd10: {
      code: 'I10',
      display: 'Essential (primary) hypertension',
      active: true,
    },
    medicalRecord: {
      authoredAt: new Date('2026-08-12T01:05:00.000Z'),
      finalizedAt: new Date('2026-08-12T02:05:00.000Z'),
      diagnoses: [
        { id: diagnosisId, isPrimary: true },
        { id: 'diagnosis-secondary', isPrimary: false },
      ],
      encounter: {
        id: encounterId,
        encounterNumber: 'ENC-2026-000001',
        arrivedAt: new Date('2026-08-12T01:00:00.000Z'),
        patient: { id: 'patient-local-1', fullName: 'Budi Santoso' },
        doctor: { id: 'doctor-local-1', fullName: 'dr. Bronsig' },
      },
    },
    ...overrides,
  };
}

function buildService(
  options: {
    missing?: 'Patient' | 'Encounter' | 'Practitioner';
    conditionExternalResourceId?: string;
    diagnosis?: Record<string, unknown>;
  } = {},
) {
  const diagnosis = options.diagnosis ?? diagnosisRecord();
  const localDiagnosisId = String(diagnosis.id);
  const links: Record<string, { externalResourceId: string } | null> = {
    Patient: { externalResourceId: 'patient-remote-1' },
    Encounter: { externalResourceId: 'encounter-remote-1' },
    Practitioner: { externalResourceId: 'practitioner-remote-1' },
    Condition: options.conditionExternalResourceId
      ? { externalResourceId: options.conditionExternalResourceId }
      : null,
  };
  const findUnique = jest.fn(
    ({ where }: { where: Record<string, unknown> }) => {
      if (where.id === localDiagnosisId) return Promise.resolve(diagnosis);
      const scope = where.localResourceScope as
        { resourceType: string } | undefined;
      if (scope?.resourceType === options.missing) return Promise.resolve(null);
      return Promise.resolve(links[scope?.resourceType ?? ''] ?? null);
    },
  );
  const prisma = {
    diagnosis: { findUnique },
    masterIcd10: {
      findUnique: jest
        .fn()
        .mockResolvedValue((diagnosis as { icd10?: unknown }).icd10 ?? null),
    },
    externalResourceLink: { findUnique },
  };
  return {
    service: new SatusehatConditionPreflightService(prisma as never),
    findUnique,
  };
}

describe('SatusehatConditionPreflightService', () => {
  it('builds a mapped CREATE preview with the correct category and primary rank', async () => {
    const { service } = buildService();

    const preview = await service.previewCondition(diagnosisId);

    expect(preview).toEqual(
      expect.objectContaining({
        localResourceId: diagnosisId,
        encounterLocalResourceId: encounterId,
        operation: 'CREATE',
        rank: 1,
        category: 'encounter-diagnosis',
        mappingStatus: 'MAPPED',
      }),
    );
    expect(preview.payload.resourceType).toBe('Condition');
    expect(preview.payload.category[0]?.coding[0]).toEqual(
      expect.objectContaining({
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
      }),
    );
    expect(preview.payload.code.coding[0]).toEqual(
      expect.objectContaining({
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: 'I10',
      }),
    );
    expect(preview.payload.subject.reference).toBe('Patient/patient-remote-1');
    expect(preview.payload.encounter.reference).toBe(
      'Encounter/encounter-remote-1',
    );
    expect(preview.payload.recorder.reference).toBe(
      'Practitioner/practitioner-remote-1',
    );
    expect(preview.payload.asserter.reference).toBe(
      'Practitioner/practitioner-remote-1',
    );
  });

  it('uses UPDATE and preserves the secondary rank when a Condition linkage exists', async () => {
    const secondary = diagnosisRecord({
      id: 'diagnosis-secondary',
      icd10Code: 'J06.9',
      icd10: {
        code: 'J06.9',
        display: 'Acute upper respiratory infection',
        active: true,
      },
      isPrimary: false,
    });
    const { service } = buildService({
      conditionExternalResourceId: 'condition-remote-secondary',
      diagnosis: secondary,
    });

    const preview = await service.previewCondition('diagnosis-secondary');

    expect(preview.operation).toBe('UPDATE');
    expect(preview.externalResourceId).toBe('condition-remote-secondary');
    expect(preview.rank).toBe(2);
    expect(preview.payload.id).toBe('condition-remote-secondary');
  });

  it.each(['Patient', 'Encounter', 'Practitioner'] as const)(
    'blocks before a remote operation when %s is not linked',
    async (missing) => {
      const { service } = buildService({ missing });

      await expect(service.previewCondition(diagnosisId)).rejects.toMatchObject(
        {
          constructor: ConflictException,
          response: expect.objectContaining({
            code: 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING',
            dependencies: [missing],
          }),
        },
      );
    },
  );

  it('blocks an ICD-10 code that is not mapped to the active catalog', async () => {
    const { service } = buildService({
      diagnosis: diagnosisRecord({
        icd10: null,
      }),
    });

    await expect(service.previewCondition(diagnosisId)).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'SATUSEHAT_CONDITION_MAPPING_REQUIRED',
        mappingStatus: 'mapping-required',
      }),
    });
  });
});
