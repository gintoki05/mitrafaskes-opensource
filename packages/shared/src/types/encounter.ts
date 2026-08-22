import type { PaginatedListResponse } from './pagination';
import type { UserRole } from './auth';
import type { ResourceIntegrationSummary } from './integrations';
import type { Gender } from './patient';

export type TriageStatus = 'NOT_STARTED' | 'DRAFT' | 'COMPLETED';

export interface TriageSummary {
  status: TriageStatus;
  updatedAt?: string;
  completedAt?: string;
  completedBy?: string;
}

export enum EncounterStatus {
  PLANNED = "planned",
  ARRIVED = "arrived",
  TRIAGED = "triaged",
  IN_PROGRESS = "in-progress",
  ONLEAVE = "onleave",
  FINISHED = "finished",
  CANCELLED = "cancelled",
  ENTERED_IN_ERROR = "entered-in-error",
  UNKNOWN = "unknown",
}

/** Encounter statuses that remain in the active local queue until completion. */
export const ACTIVE_ENCOUNTER_STATUSES: readonly EncounterStatus[] = [
  EncounterStatus.ARRIVED,
  EncounterStatus.TRIAGED,
  EncounterStatus.IN_PROGRESS,
  EncounterStatus.ONLEAVE,
];

export interface EncounterStatusHistory {
  id: string;
  status: EncounterStatus;
  periodStart: string;
  periodEnd?: string;
  actorUserId?: string;
  actorUsername: string;
  actorRole: UserRole;
  reason?: string;
}

export interface Encounter {
  id: string;
  encounterNumber: string;
  patientId: string;
  doctorId: string;
  organizationId: string;
  locationId: string;
  queueDate: string;
  queueNumber: number;
  status: EncounterStatus;
  arrivedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  version: number;
  statusHistory: EncounterStatusHistory[];
  createdAt: string;
  updatedAt: string;
  integrations: ResourceIntegrationSummary[];
  triage?: TriageSummary;
  patient?: {
    nik?: string;
    fullName: string;
    medicalRecNo: string;
    birthDate: string;
    gender: Gender;
    address?: string;
    phone?: string;
    birthPlaceText?: string;
  };
  doctor?: {
    fullName: string;
    sipNumber?: string;
  };
  organization?: {
    id: string;
    code: string;
    name: string;
  };
  location?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateEncounterDto {
  patientId: string;
  locationId: string;
  doctorId: string;
}

export interface UpdateEncounterStatusDto {
  status: EncounterStatus;
  expectedVersion: number;
  reason?: string;
}

export interface EncounterListQuery {
  page?: number;
  pageSize?: number;
  queueDate?: string;
  /** Include non-terminal encounters from earlier queue dates in the active queue. */
  includeActiveAcrossDates?: boolean;
  locationId?: string;
  status?: EncounterStatus;
  statuses?: EncounterStatus[];
  triageStatuses?: TriageStatus[];
}

export type EncounterStatusCounts = Record<EncounterStatus, number>;

export interface EncounterListResponse extends PaginatedListResponse<Encounter> {
  statusCounts?: EncounterStatusCounts;
}

export interface EncounterHistoryListQuery {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  status?: EncounterStatus;
}

export type EncounterHistoryListResponse = PaginatedListResponse<Encounter>;
