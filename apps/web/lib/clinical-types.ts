import type {
  Encounter as SharedEncounter,
  PaginatedListResponse,
  Patient as SharedPatient,
} from '@mitrafaskes/shared';

export type Patient = SharedPatient;

export type Encounter = SharedEncounter;

export interface SyncLog {
  id: string;
  resourceId: string;
  resourceType: string;
  updatedAt: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | string;
  satusehatId?: string;
  payload: unknown;
}

export type EncounterListResponse = PaginatedListResponse<Encounter>;
export type SyncLogListResponse = PaginatedListResponse<SyncLog>;

export interface Icd10Entry {
  code: string;
  display: string;
  nameIndo?: string;
  nameEng: string;
}
