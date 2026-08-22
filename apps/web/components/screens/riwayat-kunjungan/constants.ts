import { EncounterStatus } from '@mitrafaskes/shared';
import {
  getLocalEncounterStatusClass,
  localEncounterStatusLabels,
  localEncounterStatusTooltips,
} from '../../../lib/encounter-status-display.ts';
import type {
  VisitHistoryFilters,
  VisitHistoryStatusFilter,
} from './types';

export const VISIT_HISTORY_PAGE_SIZE = 25;
export const VISIT_HISTORY_RANGE_DAYS = 30;

export const visitHistoryStatusLabels: Record<VisitHistoryStatusFilter, string> = {
  ALL: 'Semua status',
  [EncounterStatus.PLANNED]: localEncounterStatusLabels[EncounterStatus.PLANNED],
  [EncounterStatus.ARRIVED]: localEncounterStatusLabels[EncounterStatus.ARRIVED],
  [EncounterStatus.TRIAGED]: localEncounterStatusLabels[EncounterStatus.TRIAGED],
  [EncounterStatus.IN_PROGRESS]: localEncounterStatusLabels[EncounterStatus.IN_PROGRESS],
  [EncounterStatus.ONLEAVE]: localEncounterStatusLabels[EncounterStatus.ONLEAVE],
  [EncounterStatus.FINISHED]: localEncounterStatusLabels[EncounterStatus.FINISHED],
  [EncounterStatus.CANCELLED]: localEncounterStatusLabels[EncounterStatus.CANCELLED],
  [EncounterStatus.ENTERED_IN_ERROR]: localEncounterStatusLabels[EncounterStatus.ENTERED_IN_ERROR],
  [EncounterStatus.UNKNOWN]: localEncounterStatusLabels[EncounterStatus.UNKNOWN],
};

export const encounterStatusLabels: Record<EncounterStatus, string> = localEncounterStatusLabels;

export const encounterStatusTooltips: Record<EncounterStatus, string> = localEncounterStatusTooltips;

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
  return getLocalEncounterStatusClass(status);
}
