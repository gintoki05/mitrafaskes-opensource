import type { EncounterStatus } from '@mitrafaskes/shared';
import type {
  VisitHistoryFilters,
  VisitHistoryStatusFilter,
} from './types';

export const VISIT_HISTORY_PAGE_SIZE = 25;
export const VISIT_HISTORY_RANGE_DAYS = 30;

export const visitHistoryStatusLabels: Record<VisitHistoryStatusFilter, string> = {
  ALL: 'Semua status',
  WAITING: 'Menunggu',
  IN_PROGRESS: 'Diperiksa',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const encounterStatusLabels: Record<EncounterStatus, string> = {
  WAITING: 'MENUNGGU',
  IN_PROGRESS: 'DIPERIKSA',
  COMPLETED: 'SELESAI',
  CANCELLED: 'DIBATALKAN',
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
    return 'clinical-status-warning border text-[11px] font-bold';
  }
  if (status === 'IN_PROGRESS') {
    return 'border-primary/20 bg-primary/10 text-[11px] font-bold text-primary';
  }
  if (status === 'CANCELLED') {
    return 'clinical-status-error border text-[11px] font-bold';
  }
  return 'clinical-status-success border text-[11px] font-bold';
}
