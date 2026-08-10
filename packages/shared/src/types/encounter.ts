import type { PaginatedListResponse } from './pagination';
import type { SatusehatEncounterPayload } from './satusehat';
import type { UserRole } from './auth';

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

export interface EncounterLinkageSummary {
  externalResourceId: string;
  lastSyncedAt?: string;
}

export interface EncounterSyncSummary {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  updatedAt: string;
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
  satusehat?: EncounterLinkageSummary;
  satusehatSync?: EncounterSyncSummary;
  patient?: {
    nik?: string;
    fullName: string;
    medicalRecNo: string;
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

export interface SatusehatEncounterPreview {
  encounterId: string;
  ready: boolean;
  blockers: Array<{
    code: string;
    resourceType: string;
    localResourceId: string;
    message: string;
  }>;
  payload?: SatusehatEncounterPayload;
}

export type EncounterListResponse = PaginatedListResponse<Encounter>;
