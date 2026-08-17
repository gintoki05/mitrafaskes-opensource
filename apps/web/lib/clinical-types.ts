import type {
  Encounter as SharedEncounter,
  IntegrationLog,
  IntegrationLogListResponse,
  PaginatedListResponse,
  Patient as SharedPatient,
} from '@mitrafaskes/shared';

export type Patient = SharedPatient;

export type Encounter = SharedEncounter;

export type SyncLog = IntegrationLog;

export type EncounterListResponse = PaginatedListResponse<Encounter>;
export type SyncLogListResponse = IntegrationLogListResponse;

export interface Icd10Entry {
  code: string;
  display: string;
  nameIndo?: string;
  nameEng: string;
}
