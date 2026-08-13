import type { VisitHistoryFilters } from './types';

export type VisitHistoryTableState = 'loading' | 'error' | 'empty' | 'ready';

export function updateVisitHistoryFilters(
  value: VisitHistoryFilters,
  changes: Partial<VisitHistoryFilters>,
): { value: VisitHistoryFilters; page: number } {
  return {
    value: { ...value, ...changes },
    page: 1,
  };
}

export function resolveVisitHistoryTableState(input: {
  loading: boolean;
  error: string;
  itemCount: number;
}): VisitHistoryTableState {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.itemCount === 0) return 'empty';
  return 'ready';
}
