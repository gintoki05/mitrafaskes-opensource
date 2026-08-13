/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Jest matcher and mock-call APIs intentionally expose any in this isolated unit test. */
import { BadGatewayException, ConflictException } from '@nestjs/common';
import type { SatusehatEncounterPreview } from '@mitrafaskes/shared';
import { SatusehatEncounterService } from './satusehat-encounter.service';

const localResourceId = 'enc-local-42';
const remoteResourceId = 'encounter-remote-42';

function preview(
  operation: 'CREATE' | 'UPDATE' = 'CREATE',
): SatusehatEncounterPreview {
  return {
    localResourceId,
    operation,
    ...(operation === 'UPDATE' ? { externalResourceId: remoteResourceId } : {}),
    payload: {
      resourceType: 'Encounter',
      ...(operation === 'UPDATE' ? { id: remoteResourceId } : {}),
    } as SatusehatEncounterPreview['payload'],
  };
}

function buildService(prepared = preview()) {
  const syncLogCreate = jest.fn().mockResolvedValue({ id: 'sync-log-1' });
  const syncLogUpdate = jest.fn().mockResolvedValue({});
  const linkUpsert = jest.fn().mockResolvedValue({});
  const linkDelete = jest.fn().mockResolvedValue({});
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
      delete: linkDelete,
    },
    $transaction: transaction,
  };
  const preflight = {
    previewEncounter: jest.fn().mockResolvedValue(prepared),
    preparePreview: jest.fn().mockResolvedValue(prepared),
  };
  const fhir = {
    createEncounter: jest.fn().mockResolvedValue({
      resourceType: 'Encounter',
      id: remoteResourceId,
    }),
    updateEncounter: jest.fn().mockResolvedValue({
      resourceType: 'Encounter',
      id: remoteResourceId,
    }),
  };

  return {
    service: new SatusehatEncounterService(
      prisma as never,
      preflight as never,
      fhir as never,
    ),
    fhir,
    linkDelete,
    linkUpsert,
    preflight,
    syncLogCreate,
    syncLogUpdate,
    transaction,
  };
}

describe('SatusehatEncounterService sync', () => {
  it('creates an unlinked Encounter and persists safe versioned log metadata plus linkage', async () => {
    const context = buildService();

    await expect(
      context.service.syncEncounter(localResourceId),
    ).resolves.toEqual(
      expect.objectContaining({
        operation: 'CREATE',
        externalResourceId: remoteResourceId,
        syncedRemotely: true,
        syncLogId: 'sync-log-1',
      }),
    );

    expect(context.fhir.createEncounter).toHaveBeenCalledTimes(1);
    expect(context.fhir.updateEncounter).not.toHaveBeenCalled();
    expect(context.linkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          localResourceId,
          externalResourceId: remoteResourceId,
        }),
      }),
    );
    const pendingPayload = context.syncLogCreate.mock.calls[0]?.[0]?.data
      ?.payload as Record<string, Record<string, string>>;
    expect(pendingPayload.metadata).toEqual(
      expect.objectContaining({
        provider: 'SATUSEHAT',
        environment: 'sandbox',
        mapperVersion: 'mitrafaskes-encounter-mapper-v1',
        fhirProfileVersion: 'FHIR-R4-Encounter-v1',
        playbookVersion: 'mitrafaskes-satusehat-rawat-jalan-v1',
        operation: 'PREFLIGHT',
      }),
    );
    expect(JSON.stringify(pendingPayload)).not.toMatch(
      /3173000000000001|bearer|access[_-]?token|secret/i,
    );
    expect(context.transaction).toHaveBeenCalledTimes(1);
  });

  it('updates a linked Encounter with the same remote id', async () => {
    const context = buildService(preview('UPDATE'));

    const result = await context.service.syncEncounter(localResourceId);

    expect(context.fhir.updateEncounter).toHaveBeenCalledWith(
      remoteResourceId,
      expect.objectContaining({ id: remoteResourceId }),
    );
    expect(context.fhir.createEncounter).not.toHaveBeenCalled();
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
        code: 'SATUSEHAT_ENCOUNTER_DEPENDENCY_MISSING',
        message: 'Patient belum terhubung.',
      }),
    );

    await expect(
      context.service.syncEncounter(localResourceId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(context.syncLogCreate).toHaveBeenCalledTimes(1);
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Patient belum terhubung.',
        }),
      }),
    );
    expect(context.fhir.createEncounter).not.toHaveBeenCalled();
    expect(context.fhir.updateEncounter).not.toHaveBeenCalled();
    expect(context.linkUpsert).not.toHaveBeenCalled();
  });

  it('does not create a false linkage when remote create fails', async () => {
    const context = buildService();
    context.fhir.createEncounter.mockRejectedValue(new Error('remote failure'));

    await expect(
      context.service.syncEncounter(localResourceId),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(context.linkUpsert).not.toHaveBeenCalled();
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('preserves the existing linkage when remote update fails', async () => {
    const context = buildService(preview('UPDATE'));
    context.fhir.updateEncounter.mockRejectedValue(new Error('remote failure'));

    await expect(
      context.service.syncEncounter(localResourceId),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(context.linkUpsert).not.toHaveBeenCalled();
    expect(context.linkDelete).not.toHaveBeenCalled();
    expect(context.syncLogUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('rejects a different remote id on update without replacing the linkage', async () => {
    const context = buildService(preview('UPDATE'));
    context.fhir.updateEncounter.mockResolvedValue({
      resourceType: 'Encounter',
      id: 'unexpected-remote-id',
    });

    await expect(
      context.service.syncEncounter(localResourceId),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'SATUSEHAT_ENCOUNTER_REMOTE_ID_MISMATCH',
      }),
    });
    expect(context.linkUpsert).not.toHaveBeenCalled();
  });
});
