import type { PaginatedListResponse } from './pagination';

export enum EncounterStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  queueNumber: number;
  status: EncounterStatus;
  satusehatEncounterId?: string;
  createdAt: string;
  patient?: {
    nik?: string;
    fullName: string;
    medicalRecNo: string;
  };
  doctor?: {
    fullName: string;
    sipNumber?: string;
  };
}

export interface CreateEncounterDto {
  patientId: string;
  doctorId: string;
  notes?: string;
}

export type EncounterListResponse = PaginatedListResponse<Encounter>;
