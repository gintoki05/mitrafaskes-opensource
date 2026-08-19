import { BadGatewayException, ConflictException } from '@nestjs/common';
import type { SatusehatConditionPreview } from './satusehat-condition.contract';
import { SatusehatConditionEncounterLifecycleService } from './satusehat-condition-encounter-lifecycle.service';
import { SatusehatConditionService } from './satusehat-condition.service';
import { SatusehatFhirError } from './satusehat-fhir.client';

const localResourceId = 'diagnosis-primary';
const remoteResourceId = 'condition-remote-primary';

function preview(
  operation: 'CREATE' | 'UPDATE' = 'CREATE',
): SatusehatConditionPreview {
  return {
    localResourceId,
    encounterLocalResourceId: 'encounter-local-1',
    operation,
    ...(operation === 'UPDATE' ? { externalResourceId: remoteResourceId } : {}),
    rank: 1,
    category: 'encounter-diagnosis',
    mappingStatus: 'MAPPED',
    payload: {
      resourceType: 'Condition',
      ...(operation === 'UPDATE' ? { id: remoteResourceId } : {}),
    } as SatusehatConditionPreview['payload'],
  };
}

function buildService(
  prepared = preview(),
  options: {
    encounters?: {
      syncEncounter: jest.Mock;
      syncHistoricalInProgressEncounter: jest.Mock;
    };
  } = {},
) {
  const syncLogCreate = jest.fn().mockResolvedValue({ id: 'condition-sync-1' });
  const syncLogUpdate = jest.fn().mockResolvedValue({});
  const linkUpsert = jest.fn().mockResolvedValue({});
  const transaction = jest.fn(async (actions: Promise<unknown>[]) =>
    Promise.all(actions),
  );
  const prisma = {
    satusehatSyncLog: {
      create: syncLogCreate,
      update: syncLogUpdate,
    },
    externalResourceLink: {
      upsert: linkUpsert,
    },
    $transaction: transaction,
  };
  const preflight = {
    previewCondition: jest.fn().mockResolvedValue(prepared),
    preparePreview: jest.fn().mockResolvedValue(prepared),
  };
  const fhir = {
    createCondition: jest.fn().mockResolvedValue({
      resourceType: 'Condition',
      id: remoteResourceId,
    }),
    updateCondition: jest.fn().mockResolvedValue({
      resourceType: 'Condition',
      id: remoteResourceId,
    }),
  };
  const encounterLifecycle = options.encounters
    ? new SatusehatConditionEncounterLifecycleService(
        preflight as never,
        options.encounters as never,
      )
    : undefined;

  return {
    service: new SatusehatConditionService(
      prisma as never,
      preflight as never,
      fhir as never,
      encounterLifecycle,
    ),
    fhir,
    linkUpsert,
    preflight,
    syncLogCreate,
    syncLogUpdate,
    transaction,
  };
}

describe('SatusehatConditionService sync', () => {
  it('creates an unlinked Condition and persists linkage plus safe audit metadata', async () => {
    const context = buildService();

    const result = await context.service.syncCondition(localResourceId);
    expect(result).toEqual(
      expect.objectContaining({
        operation: 'CREATE',
        externalResourceId: remoteResourceId,
        syncedRemotely: true,
        syncLogId: 'condition-sync-1',
        response: { resourceType: 'Condition', id: remoteResourceId },
      }),
    );
    expect(result).not.toHaveProperty('payload');

    expect(context.fhir.createCondition).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'Condition' }),
    );
    expect(context.fhir.updateCondition).not.toHaveBeenCalled();
    expect(context.linkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resourceType: 'Condition',
          localResourceType: 'Diagnosis',
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
        mapperVersion: 'mitrafaskes-condition-mapper-v1',
        fhirProfileVersion: 'FHIR-R4-Condition-v1',
        playbookVersion: 'mitrafaskes-satusehat-rawat-jalan-v1',
        operation: 'PREFLIGHT',
      }),
    );
    expect(JSON.stringify(pendingPayload)).not.toMatch(
      /bearer|access[_-]?token|secret/i,
    );
  });

  it('uses PUT with the same remote id on repeat sync', async () => {
    const context = buildService(preview('UPDATE'));

    const result = await context.service.syncCondition(localResourceId);

    expect(context.fhir.updateCondition).toHaveBeenCalledWith(
      remoteResourceId,
      expect.objectContaining({ id: remoteResourceId }),
    );
    expect(context.fhir.createCondition).not.toHaveBeenCalled();
    expect(result.externalResourceId).toBe(remoteResourceId);
    expect(context.linkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          externalResourceId: remoteResourceId,
        }),
      }),
    );
  });

  it('logs a dependency failure and never calls the FHIR client', async () => {
    const context = buildService();
    context.preflight.preparePreview.mockRejectedValue(
      new ConflictException({
        code: 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING',
        message: 'Encounter belum terhubung.',
      }),
    );

    await expect(
      context.service.syncCondition(localResourceId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(context.syncLogCreate).toHaveBeenCalledTimes(1);
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Encounter belum terhubung.',
        }),
      }),
    );
    expect(context.fhir.createCondition).not.toHaveBeenCalled();
    expect(context.fhir.updateCondition).not.toHaveBeenCalled();
    expect(context.linkUpsert).not.toHaveBeenCalled();
  });

  it('recovers a completed unlinked Encounter before creating Condition, then projects finished', async () => {
    const dependencyError = new ConflictException({
      code: 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING',
      message: 'Encounter belum terhubung.',
      dependencies: ['Encounter'],
      issues: [
        {
          resourceType: 'Encounter',
          localResourceId: 'encounter-local-1',
        },
      ],
    });
    const encounters = {
      syncHistoricalInProgressEncounter: jest.fn().mockResolvedValue({
        syncLogId: 'encounter-bootstrap-log-1',
      }),
      syncEncounter: jest.fn().mockResolvedValue({
        syncLogId: 'encounter-finished-log-1',
      }),
    };
    const context = buildService(preview(), { encounters });
    context.preflight.preparePreview
      .mockRejectedValueOnce(dependencyError)
      .mockResolvedValueOnce(preview());

    const result = await context.service.syncCondition(localResourceId);

    expect(encounters.syncHistoricalInProgressEncounter).toHaveBeenCalledWith(
      'encounter-local-1',
    );
    expect(context.preflight.preparePreview).toHaveBeenCalledTimes(2);
    expect(context.fhir.createCondition).toHaveBeenCalledTimes(1);
    expect(encounters.syncEncounter).toHaveBeenCalledWith('encounter-local-1');
    expect(result).toEqual(
      expect.objectContaining({
        encounterBootstrapSyncLogId: 'encounter-bootstrap-log-1',
        encounterSyncLogId: 'encounter-finished-log-1',
      }),
    );
  });

  it('does not bootstrap Encounter while another Condition dependency is missing', async () => {
    const encounters = {
      syncHistoricalInProgressEncounter: jest.fn(),
      syncEncounter: jest.fn(),
    };
    const context = buildService(preview(), { encounters });
    context.preflight.preparePreview.mockRejectedValue(
      new ConflictException({
        code: 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING',
        message: 'Patient dan Encounter belum terhubung.',
        dependencies: ['Patient', 'Encounter'],
        issues: [
          { resourceType: 'Patient', localResourceId: 'patient-local-1' },
          { resourceType: 'Encounter', localResourceId: 'encounter-local-1' },
        ],
      }),
    );

    await expect(
      context.service.syncCondition(localResourceId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(encounters.syncHistoricalInProgressEncounter).not.toHaveBeenCalled();
    expect(encounters.syncEncounter).not.toHaveBeenCalled();
    expect(context.fhir.createCondition).not.toHaveBeenCalled();
  });

  it('keeps recovery linkage separate and does not project finished when Condition create fails', async () => {
    const encounters = {
      syncHistoricalInProgressEncounter: jest.fn().mockResolvedValue({
        syncLogId: 'encounter-bootstrap-log-1',
      }),
      syncEncounter: jest.fn(),
    };
    const context = buildService(preview(), { encounters });
    context.preflight.preparePreview
      .mockRejectedValueOnce(
        new ConflictException({
          code: 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING',
          message: 'Encounter belum terhubung.',
          dependencies: ['Encounter'],
          issues: [
            {
              resourceType: 'Encounter',
              localResourceId: 'encounter-local-1',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(preview());
    context.fhir.createCondition.mockRejectedValue(new Error('remote failure'));

    await expect(
      context.service.syncCondition(localResourceId),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(encounters.syncHistoricalInProgressEncounter).toHaveBeenCalledTimes(
      1,
    );
    expect(encounters.syncEncounter).not.toHaveBeenCalled();
    expect(context.linkUpsert).not.toHaveBeenCalled();
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('records mapping-required without presenting a false sync success', async () => {
    const context = buildService();
    context.preflight.preparePreview.mockRejectedValue(
      new ConflictException({
        code: 'SATUSEHAT_CONDITION_MAPPING_REQUIRED',
        mappingStatus: 'mapping-required',
        message: 'Diagnosis memerlukan mapping ICD-10.',
      }),
    );

    await expect(
      context.service.syncCondition(localResourceId),
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
    expect(context.fhir.createCondition).not.toHaveBeenCalled();
  });

  it('preserves a previous linkage when the repeat remote update fails', async () => {
    const context = buildService(preview('UPDATE'));
    context.fhir.updateCondition.mockRejectedValue(new Error('remote failure'));

    await expect(
      context.service.syncCondition(localResourceId),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(context.linkUpsert).not.toHaveBeenCalled();
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('rejects a different remote id on update without replacing the linkage', async () => {
    const context = buildService(preview('UPDATE'));
    context.fhir.updateCondition.mockResolvedValue({
      resourceType: 'Condition',
      id: 'unexpected-condition-id',
    });

    await expect(
      context.service.syncCondition(localResourceId),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_CONDITION_REMOTE_ID_MISMATCH',
      }),
    });
    expect(context.linkUpsert).not.toHaveBeenCalled();
  });

  it('persists retry classification and retry context on transient failure', async () => {
    const context = buildService();
    context.fhir.createCondition.mockRejectedValue(
      new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        'FHIR temporary outage',
        503,
      ),
    );

    await expect(
      context.service.syncCondition(localResourceId, {
        retryAttempt: 2,
        retryOfLogId: 'condition-failed-1',
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
        retryOfLogId: 'condition-failed-1',
        backoffMs: expect.any(Number),
        retryAfterAt: expect.any(String),
      }),
    );
  });

  it('refreshes Encounter.diagnosis after Condition linkage and keeps Condition success if projection fails', async () => {
    const encounters = {
      syncHistoricalInProgressEncounter: jest.fn(),
      syncEncounter: jest
        .fn()
        .mockRejectedValue(new Error('encounter projection failed')),
    };
    const context = buildService(preview(), { encounters });

    const result = await context.service.syncCondition(localResourceId);

    expect(encounters.syncEncounter).toHaveBeenCalledWith('encounter-local-1');
    expect(result).toEqual(
      expect.objectContaining({
        syncedRemotely: true,
        externalResourceId: remoteResourceId,
      }),
    );
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCESS' }),
      }),
    );
  });
});
