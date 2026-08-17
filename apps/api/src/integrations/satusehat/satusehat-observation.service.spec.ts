import { BadGatewayException, ConflictException } from '@nestjs/common';
import type { SatusehatObservationPreview } from './satusehat-observation.contract';
import { SatusehatObservationService } from './satusehat-observation.service';
import { SatusehatFhirError } from './satusehat-fhir.client';

const localResourceId = 'observation-vitals-1';
const remoteResourceId = 'observation-remote-1';

function preview(
  operation: 'CREATE' | 'UPDATE' = 'CREATE',
): SatusehatObservationPreview {
  return {
    localResourceId,
    encounterLocalResourceId: 'encounter-local-1',
    operation,
    ...(operation === 'UPDATE' ? { externalResourceId: remoteResourceId } : {}),
    mappingStatus: 'MAPPED',
    provenance: 'original',
    valueType: 'quantity',
    payload: {
      resourceType: 'Observation',
      ...(operation === 'UPDATE' ? { id: remoteResourceId } : {}),
      status: 'final',
      category: [],
      code: { coding: [] },
      subject: { reference: 'Patient/patient-remote-1' },
      encounter: { reference: 'Encounter/encounter-remote-1' },
      effectiveDateTime: '2026-08-13T03:00:00.000Z',
      performer: [{ reference: 'Practitioner/practitioner-remote-1' }],
      valueQuantity: {
        value: 120,
        unit: 'mmHg',
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]',
      },
    },
  };
}

function buildService(prepared = preview()) {
  const syncLogCreate = jest
    .fn()
    .mockResolvedValue({ id: 'observation-sync-1' });
  const syncLogUpdate = jest.fn().mockResolvedValue({});
  const linkUpsert = jest.fn().mockResolvedValue({});
  const transaction = jest.fn(async (actions: Promise<unknown>[]) =>
    Promise.all(actions),
  );
  const prisma = {
    satusehatSyncLog: { create: syncLogCreate, update: syncLogUpdate },
    externalResourceLink: { upsert: linkUpsert },
    $transaction: transaction,
  };
  const preflight = {
    previewObservation: jest.fn().mockResolvedValue(prepared),
    preparePreview: jest.fn().mockResolvedValue(prepared),
  };
  const fhir = {
    createObservation: jest.fn().mockResolvedValue({
      resourceType: 'Observation',
      id: remoteResourceId,
    }),
    updateObservation: jest.fn().mockResolvedValue({
      resourceType: 'Observation',
      id: remoteResourceId,
    }),
  };

  return {
    service: new SatusehatObservationService(
      prisma as never,
      preflight as never,
      fhir as never,
    ),
    fhir,
    linkUpsert,
    preflight,
    syncLogCreate,
    syncLogUpdate,
  };
}

describe('SatusehatObservationService sync', () => {
  it('creates an unlinked Observation and persists per-item linkage plus safe audit metadata', async () => {
    const context = buildService();

    const result = await context.service.syncObservation(localResourceId);

    expect(result).toEqual(
      expect.objectContaining({
        operation: 'CREATE',
        externalResourceId: remoteResourceId,
        syncedRemotely: true,
        syncLogId: 'observation-sync-1',
        response: { resourceType: 'Observation', id: remoteResourceId },
      }),
    );
    expect(result).not.toHaveProperty('payload');
    expect(context.fhir.createObservation).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'Observation' }),
    );
    expect(context.fhir.updateObservation).not.toHaveBeenCalled();
    expect(context.linkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resourceType: 'Observation',
          localResourceType: 'ClinicalObservation',
          localResourceId,
          externalResourceId: remoteResourceId,
        }),
      }),
    );
    const pendingPayload = context.syncLogCreate.mock.calls[0]?.[0]?.data
      ?.payload as Record<string, Record<string, unknown>>;
    expect(pendingPayload.metadata).toEqual(
      expect.objectContaining({
        provider: 'SATUSEHAT',
        environment: 'sandbox',
        mapperVersion: 'mitrafaskes-observation-mapper-v1',
        fhirProfileVersion: 'FHIR-R4-Observation-v1',
        playbookVersion: 'mitrafaskes-satusehat-rawat-jalan-v1',
        operation: 'PREFLIGHT',
      }),
    );
    expect(JSON.stringify(pendingPayload)).not.toMatch(
      /bearer|access[_-]?token|secret/i,
    );
  });

  it('uses PUT with the same remote ID on repeat sync', async () => {
    const context = buildService(preview('UPDATE'));

    const result = await context.service.syncObservation(localResourceId);

    expect(context.fhir.updateObservation).toHaveBeenCalledWith(
      remoteResourceId,
      expect.objectContaining({ id: remoteResourceId }),
    );
    expect(context.fhir.createObservation).not.toHaveBeenCalled();
    expect(result.externalResourceId).toBe(remoteResourceId);
  });

  it('logs a dependency failure and never calls the FHIR client', async () => {
    const context = buildService();
    context.preflight.preparePreview.mockRejectedValue(
      new ConflictException({
        code: 'SATUSEHAT_OBSERVATION_DEPENDENCY_MISSING',
        message: 'Practitioner belum terhubung.',
      }),
    );

    await expect(
      context.service.syncObservation(localResourceId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Practitioner belum terhubung.',
        }),
      }),
    );
    expect(context.fhir.createObservation).not.toHaveBeenCalled();
    expect(context.linkUpsert).not.toHaveBeenCalled();
  });

  it('records mapping-required without presenting a false sync success', async () => {
    const context = buildService();
    context.preflight.preparePreview.mockRejectedValue(
      new ConflictException({
        code: 'SATUSEHAT_OBSERVATION_MAPPING_REQUIRED',
        mappingStatus: 'mapping-required',
        message: 'Observation memerlukan mapping LOINC/UCUM.',
      }),
    );

    await expect(
      context.service.syncObservation(localResourceId),
    ).rejects.toBeInstanceOf(ConflictException);

    const failureUpdate = context.syncLogUpdate.mock.calls.at(-1)?.[0] as {
      data: { payload: { metadata: Record<string, unknown> } };
    };
    expect(failureUpdate.data.payload.metadata).toEqual(
      expect.objectContaining({
        mappingStatus: 'mapping-required',
        errorCategory: 'TERMINOLOGY',
        retryable: false,
        operatorAction: 'FIX_TERMINOLOGY',
      }),
    );
    expect(context.fhir.createObservation).not.toHaveBeenCalled();
  });

  it('classifies missing derived sources as a reference failure', async () => {
    const context = buildService();
    context.preflight.preparePreview.mockRejectedValue(
      new ConflictException({
        code: 'SATUSEHAT_OBSERVATION_DERIVED_SOURCE_MISSING',
        message: 'Source Observation belum terhubung.',
      }),
    );

    await expect(
      context.service.syncObservation(localResourceId),
    ).rejects.toBeInstanceOf(ConflictException);

    const failureUpdate = context.syncLogUpdate.mock.calls.at(-1)?.[0] as {
      data: { payload: { metadata: Record<string, unknown> } };
    };
    expect(failureUpdate.data.payload.metadata).toEqual(
      expect.objectContaining({
        errorCategory: 'REFERENCE_MISSING',
        retryable: false,
        operatorAction: 'FIX_REFERENCE',
      }),
    );
  });

  it('preserves a previous linkage when a repeat update fails', async () => {
    const context = buildService(preview('UPDATE'));
    context.fhir.updateObservation.mockRejectedValue(
      new Error('remote failure'),
    );

    await expect(
      context.service.syncObservation(localResourceId),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(context.linkUpsert).not.toHaveBeenCalled();
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('persists retry classification and retry context on transient failure', async () => {
    const context = buildService();
    context.fhir.createObservation.mockRejectedValue(
      new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        'FHIR temporary outage',
        503,
      ),
    );

    await expect(
      context.service.syncObservation(localResourceId, {
        retryAttempt: 2,
        retryOfLogId: 'observation-failed-1',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    const failureUpdate = context.syncLogUpdate.mock.calls.at(-1)?.[0] as {
      data: { payload: { metadata: Record<string, unknown> } };
    };
    expect(failureUpdate.data.payload.metadata).toEqual(
      expect.objectContaining({
        errorCode: 'SATUSEHAT_FHIR_REQUEST_FAILED',
        errorCategory: 'TRANSIENT',
        retryable: true,
        operatorAction: 'RETRY_WITH_BACKOFF',
        retryAttempt: 2,
        retryOfLogId: 'observation-failed-1',
        backoffMs: expect.any(Number),
        retryAfterAt: expect.any(String),
      }),
    );
  });

  it('rejects a changed remote ID on update without replacing linkage', async () => {
    const context = buildService(preview('UPDATE'));
    context.fhir.updateObservation.mockResolvedValue({
      resourceType: 'Observation',
      id: 'unexpected-observation-id',
    });

    await expect(
      context.service.syncObservation(localResourceId),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_OBSERVATION_REMOTE_ID_MISMATCH',
      }),
    });
    expect(context.linkUpsert).not.toHaveBeenCalled();
  });
});
