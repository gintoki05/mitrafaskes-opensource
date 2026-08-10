export interface SatusehatSyncLog {
  id: string;
  resourceType:
    | 'Organization'
    | 'Encounter'
    | 'Condition'
    | 'Observation'
    | 'MedicationRequest';
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload: any;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
}

export class MemoryStore {
  static syncLogs: SatusehatSyncLog[] = [
    {
      id: 'sync-1',
      resourceType: 'Encounter',
      resourceId: 'enc-001',
      status: 'SUCCESS',
      payload: { resourceType: 'Encounter', status: 'in-progress' },
      satusehatId: 'ENC-SATUSEHAT-9901',
      updatedAt: new Date().toISOString(),
    },
  ];
}
