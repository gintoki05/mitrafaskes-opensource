import { EncounterStatus } from '@mitrafaskes/shared';
import {
  getSatusehatEncounterStatus,
  getSatusehatEncounterStatusTooltip,
} from '../../satusehat/satusehat-status.ts';
import type {
  VisitHistoryFilters,
  VisitHistoryStatusFilter,
} from './types';

export const VISIT_HISTORY_PAGE_SIZE = 25;
export const VISIT_HISTORY_RANGE_DAYS = 30;

export const visitHistoryStatusLabels: Record<VisitHistoryStatusFilter, string> = {
  ALL: 'Semua status',
  WAITING: getSatusehatEncounterStatus(EncounterStatus.WAITING),
  IN_PROGRESS: getSatusehatEncounterStatus(EncounterStatus.IN_PROGRESS),
  COMPLETED: getSatusehatEncounterStatus(EncounterStatus.COMPLETED),
  CANCELLED: getSatusehatEncounterStatus(EncounterStatus.CANCELLED),
};

export const encounterStatusLabels: Record<EncounterStatus, string> = {
  WAITING: getSatusehatEncounterStatus(EncounterStatus.WAITING),
  IN_PROGRESS: getSatusehatEncounterStatus(EncounterStatus.IN_PROGRESS),
  COMPLETED: getSatusehatEncounterStatus(EncounterStatus.COMPLETED),
  CANCELLED: getSatusehatEncounterStatus(EncounterStatus.CANCELLED),
};

export const encounterStatusTooltips: Record<EncounterStatus, string> = {
  WAITING: getSatusehatEncounterStatusTooltip(EncounterStatus.WAITING),
  IN_PROGRESS: getSatusehatEncounterStatusTooltip(EncounterStatus.IN_PROGRESS),
  COMPLETED: getSatusehatEncounterStatusTooltip(EncounterStatus.COMPLETED),
  CANCELLED: getSatusehatEncounterStatusTooltip(EncounterStatus.CANCELLED),
};

export const visitHistoryStatusTooltips: Record<VisitHistoryStatusFilter, string> = {
  ALL: 'Menampilkan semua status Encounter.',
  WAITING: encounterStatusTooltips.WAITING,
  IN_PROGRESS: encounterStatusTooltips.IN_PROGRESS,
  COMPLETED: encounterStatusTooltips.COMPLETED,
  CANCELLED: encounterStatusTooltips.CANCELLED,
};

export function dateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

export function shiftDateInputValue(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
}

export function defaultVisitHistoryFilters(now = new Date()): VisitHistoryFilters {
  const toDate = dateInputValue(now);
  return {
    fromDate: shiftDateInputValue(toDate, -(VISIT_HISTORY_RANGE_DAYS - 1)),
    toDate,
    search: '',
    status: 'ALL',
  };
}

export function formatVisitDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatVisitDateTime(value: string | undefined): string {
  if (!value) return 'Belum tersedia';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function statusClass(status: EncounterStatus): string {
  if (status === 'WAITING') {
    return 'clinical-status-warning border text-xs font-semibold';
  }
  if (status === 'IN_PROGRESS') {
    return 'border-primary/20 bg-primary/10 text-xs font-semibold text-primary';
  }
  if (status === 'CANCELLED') {
    return 'clinical-status-error border text-xs font-semibold';
  }
  return 'clinical-status-success border text-xs font-semibold';
}
