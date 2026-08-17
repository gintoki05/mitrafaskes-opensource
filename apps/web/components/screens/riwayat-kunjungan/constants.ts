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
  [EncounterStatus.PLANNED]: getSatusehatEncounterStatus(EncounterStatus.PLANNED),
  [EncounterStatus.ARRIVED]: getSatusehatEncounterStatus(EncounterStatus.ARRIVED),
  [EncounterStatus.TRIAGED]: getSatusehatEncounterStatus(EncounterStatus.TRIAGED),
  [EncounterStatus.IN_PROGRESS]: getSatusehatEncounterStatus(EncounterStatus.IN_PROGRESS),
  [EncounterStatus.ONLEAVE]: getSatusehatEncounterStatus(EncounterStatus.ONLEAVE),
  [EncounterStatus.FINISHED]: getSatusehatEncounterStatus(EncounterStatus.FINISHED),
  [EncounterStatus.CANCELLED]: getSatusehatEncounterStatus(EncounterStatus.CANCELLED),
  [EncounterStatus.ENTERED_IN_ERROR]: getSatusehatEncounterStatus(EncounterStatus.ENTERED_IN_ERROR),
  [EncounterStatus.UNKNOWN]: getSatusehatEncounterStatus(EncounterStatus.UNKNOWN),
};

export const encounterStatusLabels: Record<EncounterStatus, string> = {
  [EncounterStatus.PLANNED]: getSatusehatEncounterStatus(EncounterStatus.PLANNED),
  [EncounterStatus.ARRIVED]: getSatusehatEncounterStatus(EncounterStatus.ARRIVED),
  [EncounterStatus.TRIAGED]: getSatusehatEncounterStatus(EncounterStatus.TRIAGED),
  [EncounterStatus.IN_PROGRESS]: getSatusehatEncounterStatus(EncounterStatus.IN_PROGRESS),
  [EncounterStatus.ONLEAVE]: getSatusehatEncounterStatus(EncounterStatus.ONLEAVE),
  [EncounterStatus.FINISHED]: getSatusehatEncounterStatus(EncounterStatus.FINISHED),
  [EncounterStatus.CANCELLED]: getSatusehatEncounterStatus(EncounterStatus.CANCELLED),
  [EncounterStatus.ENTERED_IN_ERROR]: getSatusehatEncounterStatus(EncounterStatus.ENTERED_IN_ERROR),
  [EncounterStatus.UNKNOWN]: getSatusehatEncounterStatus(EncounterStatus.UNKNOWN),
};

export const encounterStatusTooltips: Record<EncounterStatus, string> = {
  [EncounterStatus.PLANNED]: getSatusehatEncounterStatusTooltip(EncounterStatus.PLANNED),
  [EncounterStatus.ARRIVED]: getSatusehatEncounterStatusTooltip(EncounterStatus.ARRIVED),
  [EncounterStatus.TRIAGED]: getSatusehatEncounterStatusTooltip(EncounterStatus.TRIAGED),
  [EncounterStatus.IN_PROGRESS]: getSatusehatEncounterStatusTooltip(EncounterStatus.IN_PROGRESS),
  [EncounterStatus.ONLEAVE]: getSatusehatEncounterStatusTooltip(EncounterStatus.ONLEAVE),
  [EncounterStatus.FINISHED]: getSatusehatEncounterStatusTooltip(EncounterStatus.FINISHED),
  [EncounterStatus.CANCELLED]: getSatusehatEncounterStatusTooltip(EncounterStatus.CANCELLED),
  [EncounterStatus.ENTERED_IN_ERROR]: getSatusehatEncounterStatusTooltip(EncounterStatus.ENTERED_IN_ERROR),
  [EncounterStatus.UNKNOWN]: getSatusehatEncounterStatusTooltip(EncounterStatus.UNKNOWN),
};

export const visitHistoryStatusTooltips: Record<VisitHistoryStatusFilter, string> = {
  ALL: 'Menampilkan semua status Encounter.',
  [EncounterStatus.PLANNED]: encounterStatusTooltips[EncounterStatus.PLANNED],
  [EncounterStatus.ARRIVED]: encounterStatusTooltips[EncounterStatus.ARRIVED],
  [EncounterStatus.TRIAGED]: encounterStatusTooltips[EncounterStatus.TRIAGED],
  [EncounterStatus.IN_PROGRESS]: encounterStatusTooltips[EncounterStatus.IN_PROGRESS],
  [EncounterStatus.ONLEAVE]: encounterStatusTooltips[EncounterStatus.ONLEAVE],
  [EncounterStatus.FINISHED]: encounterStatusTooltips[EncounterStatus.FINISHED],
  [EncounterStatus.CANCELLED]: encounterStatusTooltips[EncounterStatus.CANCELLED],
  [EncounterStatus.ENTERED_IN_ERROR]: encounterStatusTooltips[EncounterStatus.ENTERED_IN_ERROR],
  [EncounterStatus.UNKNOWN]: encounterStatusTooltips[EncounterStatus.UNKNOWN],
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
  if (
    status === EncounterStatus.PLANNED ||
    status === EncounterStatus.ARRIVED ||
    status === EncounterStatus.TRIAGED ||
    status === EncounterStatus.ONLEAVE
  ) {
    return 'clinical-status-warning border text-xs font-semibold';
  }
  if (status === EncounterStatus.IN_PROGRESS) {
    return 'border-primary/20 bg-primary/10 text-xs font-semibold text-primary';
  }
  if (
    status === EncounterStatus.CANCELLED ||
    status === EncounterStatus.ENTERED_IN_ERROR ||
    status === EncounterStatus.UNKNOWN
  ) {
    return 'clinical-status-error border text-xs font-semibold';
  }
  return 'clinical-status-success border text-xs font-semibold';
}
