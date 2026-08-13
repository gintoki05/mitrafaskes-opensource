import type { PaginatedListResponse } from './pagination';
import type { UserRole } from './auth';
import type { ResourceIntegrationSummary } from './integrations';
import type { Gender } from './patient';

export enum EncounterStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface EncounterStatusHistory {
  id: string;
  status: EncounterStatus;
  periodStart: string;
  periodEnd?: string;
  actorUserId?: string;
  actorUsername: string;
  actorRole: UserRole;
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
}

export interface EncounterListQuery {
  page?: number;
  pageSize?: number;
  queueDate?: string;
  locationId?: string;
  status?: EncounterStatus;
}

export type EncounterListResponse = PaginatedListResponse<Encounter>;

export interface EncounterHistoryListQuery {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  status?: EncounterStatus;
}

export type EncounterHistoryListResponse = PaginatedListResponse<Encounter>;
