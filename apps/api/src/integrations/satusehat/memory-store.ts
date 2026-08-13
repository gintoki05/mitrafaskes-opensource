export interface SatusehatSyncLog {
  id: string;
  resourceType:
    | 'Organization'
    | 'Location'
    | 'Practitioner'
    | 'Patient'
    | 'Encounter';
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload: unknown;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
}

export class MemoryStore {
  static syncLogs: SatusehatSyncLog[] = [];
}
