export interface SatusehatSyncLog {
  id: string;
  resourceType: 'Organization' | 'Location' | 'Practitioner' | 'Patient';
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload: any;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
}

export class MemoryStore {
  static syncLogs: SatusehatSyncLog[] = [];
}
