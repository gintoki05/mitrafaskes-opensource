import { SatusehatReconciliationService } from './satusehat-reconciliation.service';

describe('SatusehatReconciliationService', () => {
  it('reports stale logs and linkage/log mismatches without mutating data', async () => {
    const externalResourceLink = {
      findMany: jest.fn().mockResolvedValue([
        {
          resourceType: 'Encounter',
          localResourceId: 'enc-linked',
          externalResourceId: 'remote-link',
        },
        {
          resourceType: 'Patient',
          localResourceId: 'patient-without-success',
          externalResourceId: 'remote-patient',
        },
      ]),
      delete: jest.fn(),
      update: jest.fn(),
    };
    const satusehatSyncLog = {
      findMany: jest.fn().mockResolvedValue([
        {
          resourceType: 'Encounter',
          resourceId: 'enc-linked',
          status: 'SUCCESS',
          satusehatId: 'remote-log',
          updatedAt: new Date(),
          payload: { metadata: { environment: 'sandbox' } },
        },
        {
          resourceType: 'Patient',
          resourceId: 'patient-orphan-success',
          status: 'SUCCESS',
          satusehatId: 'remote-orphan',
          updatedAt: new Date(),
          payload: { metadata: { environment: 'sandbox' } },
        },
        {
          resourceType: 'Location',
          resourceId: 'location-stale',
          status: 'PENDING',
          satusehatId: null,
          updatedAt: new Date(Date.now() - 20 * 60 * 1000),
          payload: { metadata: { environment: 'sandbox' } },
        },
        {
          resourceType: 'Encounter',
          resourceId: 'enc-production',
          status: 'FAILED',
          satusehatId: null,
          updatedAt: new Date(),
          payload: { metadata: { environment: 'production' } },
        },
      ]),
      delete: jest.fn(),
      update: jest.fn(),
    };
    const prisma = { externalResourceLink, satusehatSyncLog };
    const service = new SatusehatReconciliationService(prisma as never);

    const report = await service.reconcile('sandbox');

    expect(report).toEqual(
      expect.objectContaining({
        provider: 'SATUSEHAT',
        environment: 'sandbox',
        checkedLinks: 2,
        checkedLogs: 3,
      }),
    );
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'SUCCESS_LOG_LINKAGE_MISMATCH',
        'LINKAGE_WITHOUT_SUCCESS_LOG',
        'SUCCESS_LOG_WITHOUT_LINKAGE',
        'STALE_PENDING_LOG',
      ]),
    );
    expect(externalResourceLink.delete).not.toHaveBeenCalled();
    expect(externalResourceLink.update).not.toHaveBeenCalled();
    expect(satusehatSyncLog.delete).not.toHaveBeenCalled();
    expect(satusehatSyncLog.update).not.toHaveBeenCalled();
  });
});
