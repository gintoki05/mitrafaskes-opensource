import { ConflictException } from '@nestjs/common';
import { SatusehatObservationPreflightService } from './satusehat-observation-preflight.service';

const observationId = 'observation-vitals-1';
const encounterId = 'encounter-local-1';

function observationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: observationId,
    category: 'vital-signs',
    codeSystem: 'http://loinc.org',
    code: '8480-6',
    codeDisplay: 'Systolic blood pressure',
    valueType: 'quantity',
    valueQuantityValue: 240,
    valueQuantityUnit: 'mmHg',
    valueQuantitySystem: 'http://unitsofmeasure.org',
    valueQuantityCode: 'mm[Hg]',
    valueCodeSystem: null,
    valueCode: null,
    valueCodeDisplay: null,
    valueBoolean: null,
    valueString: null,
    effectiveAt: new Date('2026-08-13T03:00:00.000Z'),
    performerId: 'doctor-local-1',
    performer: { id: 'doctor-local-1', fullName: 'dr. Bronsig' },
    status: 'final',
    provenance: 'original',
    derivedFromObservationIds: [],
    referenceRangeLow: null,
    referenceRangeHigh: null,
    interpretationCode: null,
    interpretationDisplay: null,
    medicalRecord: {
      encounter: {
        id: encounterId,
        encounterNumber: 'ENC-2026-000001',
        patient: { id: 'patient-local-1', fullName: 'Budi Santoso' },
      },
    },
    ...overrides,
  };
}

function buildService(
  options: {
    missing?: 'Patient' | 'Encounter' | 'Practitioner';
    observationExternalResourceId?: string;
    observation?: Record<string, unknown>;
    derivedSourceExternalResourceId?: string;
  } = {},
) {
  const observation = options.observation ?? observationRecord();
  const links: Record<string, { externalResourceId: string } | null> = {
    Patient: { externalResourceId: 'patient-remote-1' },
    Encounter: { externalResourceId: 'encounter-remote-1' },
    Practitioner: { externalResourceId: 'practitioner-remote-1' },
    Observation: options.observationExternalResourceId
      ? { externalResourceId: options.observationExternalResourceId }
      : null,
  };
  const findLink = jest.fn(({ where }: { where: Record<string, unknown> }) => {
    const scope = where.localResourceScope as
      { resourceType: string; localResourceId: string } | undefined;
    if (!scope) return Promise.resolve(null);
    if (scope.resourceType === options.missing) return Promise.resolve(null);
    if (
      scope.resourceType === 'Observation' &&
      scope.localResourceId !== observationId
    ) {
      return Promise.resolve(
        options.derivedSourceExternalResourceId
          ? { externalResourceId: options.derivedSourceExternalResourceId }
          : null,
      );
    }
    return Promise.resolve(links[scope.resourceType] ?? null);
  });
  const prisma = {
    clinicalObservation: {
      findUnique: jest.fn().mockResolvedValue(observation),
    },
    externalResourceLink: { findUnique: findLink },
  };
  return {
    service: new SatusehatObservationPreflightService(prisma as never),
    findLink,
  };
}

describe('SatusehatObservationPreflightService', () => {
  it('builds a mapped preview with LOINC, UCUM, typed numeric value, and references', async () => {
    const { service } = buildService();

    const preview = await service.previewObservation(observationId);

    expect(preview).toEqual(
      expect.objectContaining({
        localResourceId: observationId,
        encounterLocalResourceId: encounterId,
        operation: 'CREATE',
        mappingStatus: 'MAPPED',
        provenance: 'original',
        valueType: 'quantity',
      }),
    );
    expect(preview.payload.code.coding[0]).toEqual(
      expect.objectContaining({
        system: 'http://loinc.org',
        code: '8480-6',
      }),
    );
    expect(preview.payload.valueQuantity).toEqual(
      expect.objectContaining({
        value: 240,
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]',
      }),
    );
    expect(preview.payload.valueQuantity?.value).not.toBe('240');
    expect(preview.payload.subject.reference).toBe('Patient/patient-remote-1');
    expect(preview.payload.encounter.reference).toBe(
      'Encounter/encounter-remote-1',
    );
    expect(preview.payload.performer[0]?.reference).toBe(
      'Practitioner/practitioner-remote-1',
    );
  });

  it('uses UPDATE with the existing Observation linkage', async () => {
    const { service } = buildService({
      observationExternalResourceId: 'observation-remote-1',
    });

    const preview = await service.previewObservation(observationId);

    expect(preview.operation).toBe('UPDATE');
    expect(preview.externalResourceId).toBe('observation-remote-1');
    expect(preview.payload.id).toBe('observation-remote-1');
  });

  it.each(['Patient', 'Encounter', 'Practitioner'] as const)(
    'blocks before a remote operation when %s is not linked',
    async (missing) => {
      const { service } = buildService({ missing });

      await expect(
        service.previewObservation(observationId),
      ).rejects.toMatchObject({
        constructor: ConflictException,
        response: expect.objectContaining({
          code: 'SATUSEHAT_OBSERVATION_DEPENDENCY_MISSING',
          dependencies: [missing],
        }),
      });
    },
  );

  it('blocks a code without an active LOINC mapping', async () => {
    const { service } = buildService({
      observation: observationRecord({
        codeSystem: undefined,
        code: 'local-unknown-observation',
      }),
    });

    await expect(
      service.previewObservation(observationId),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: expect.objectContaining({
        code: 'SATUSEHAT_OBSERVATION_MAPPING_REQUIRED',
        mappingStatus: 'mapping-required',
      }),
    });
  });

  it('blocks an invalid UCUM mapping without changing the local value', async () => {
    const { service } = buildService({
      observation: observationRecord({ valueQuantityUnit: 'kPa' }),
    });

    await expect(
      service.previewObservation(observationId),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_OBSERVATION_MAPPING_REQUIRED',
        mappingStatus: 'mapping-required',
      }),
    });
  });

  it('requires remote source linkages for derived BMI provenance', async () => {
    const { service } = buildService({
      observation: observationRecord({
        id: 'observation-bmi-1',
        code: '39156-5',
        codeDisplay: 'Body mass index (BMI) [Ratio]',
        valueQuantityValue: 24.5,
        valueQuantityUnit: 'kg/m2',
        valueQuantityCode: 'kg/m2',
        provenance: 'derived',
        derivedFromObservationIds: [
          'observation-weight-1',
          'observation-height-1',
        ],
      }),
    });

    await expect(
      service.previewObservation('observation-bmi-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_OBSERVATION_DERIVED_SOURCE_MISSING',
        dependencies: ['Observation'],
      }),
    });
  });

  it('includes remote source references for a linked derived BMI', async () => {
    const { service } = buildService({
      derivedSourceExternalResourceId: 'source-observation-remote',
      observation: observationRecord({
        id: 'observation-bmi-1',
        code: '39156-5',
        codeDisplay: 'Body mass index (BMI) [Ratio]',
        valueQuantityValue: 24.5,
        valueQuantityUnit: 'kg/m2',
        valueQuantityCode: 'kg/m2',
        provenance: 'derived',
        derivedFromObservationIds: [
          'observation-weight-1',
          'observation-height-1',
        ],
      }),
    });

    const preview = await service.previewObservation('observation-bmi-1');

    expect(preview.provenance).toBe('derived');
    expect(preview.payload.derivedFrom).toEqual([
      { reference: 'Observation/source-observation-remote' },
      { reference: 'Observation/source-observation-remote' },
    ]);
  });
});
