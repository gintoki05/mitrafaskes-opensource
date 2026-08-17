import type { EncounterStatus } from '@mitrafaskes/shared';
import type { VisitHistoryQuery } from './types';

export function serializeVisitHistoryQuery(query: VisitHistoryQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    fromDate: query.fromDate,
    toDate: query.toDate,
  });
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.status) params.set('status', query.status);
  return params.toString();
}

export function toHistoryApiQuery(input: {
  page: number;
  pageSize: number;
  fromDate: string;
  toDate: string;
  search: string;
  status: 'ALL' | EncounterStatus;
}): VisitHistoryQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    fromDate: input.fromDate,
    toDate: input.toDate,
    search: input.search.trim() || undefined,
    status: input.status === 'ALL' ? undefined : input.status,
  };
}
