export interface SyncLogRecord {
  id: string;
  resourceType: string;
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  satusehatId?: string | null;
  errorMessage?: string | null;
  updatedAt: Date | string;
  payload: unknown;
}
