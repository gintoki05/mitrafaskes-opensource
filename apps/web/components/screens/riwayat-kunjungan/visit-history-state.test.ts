import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultVisitHistoryFilters,
  VISIT_HISTORY_RANGE_DAYS,
} from './constants.ts';
import { serializeVisitHistoryQuery, toHistoryApiQuery } from './visit-history-query.ts';
import {
  resolveVisitHistoryTableState,
  updateVisitHistoryFilters,
} from './visit-history-state.ts';

test('history defaults to an inclusive thirty-day window ending today', () => {
  const filters = defaultVisitHistoryFilters(new Date('2026-08-13T12:00:00.000Z'));

  assert.equal(VISIT_HISTORY_RANGE_DAYS, 30);
  assert.deepEqual(filters, {
    fromDate: '2026-07-15',
    toDate: '2026-08-13',
    search: '',
    status: 'ALL',
  });
});

test('history query serializes the date range, search, and status filters', () => {
  const query = toHistoryApiQuery({
    page: 2,
    pageSize: 25,
    fromDate: '2026-08-01',
    toDate: '2026-08-13',
    search: 'Siti Aminah',
    status: 'COMPLETED',
  });

  assert.equal(
    serializeVisitHistoryQuery(query),
    'page=2&pageSize=25&fromDate=2026-08-01&toDate=2026-08-13&search=Siti+Aminah&status=COMPLETED',
  );
});

test('history query omits empty search and the all-status sentinel', () => {
  const query = toHistoryApiQuery({
    page: 1,
    pageSize: 25,
    fromDate: '2026-08-01',
    toDate: '2026-08-13',
    search: '  ',
    status: 'ALL',
  });

  assert.equal(
    serializeVisitHistoryQuery(query),
    'page=1&pageSize=25&fromDate=2026-08-01&toDate=2026-08-13',
  );
});

test('changing a history filter resets pagination to the first page', () => {
  const current = defaultVisitHistoryFilters(new Date('2026-08-13T12:00:00.000Z'));
  const next = updateVisitHistoryFilters(current, {
    search: 'RM-2026-000002',
  });

  assert.equal(next.page, 1);
  assert.equal(next.value.search, 'RM-2026-000002');
  assert.equal(next.value.fromDate, current.fromDate);
});

test('history table state covers loading, error, empty, and ready records', () => {
  assert.equal(resolveVisitHistoryTableState({ loading: true, error: '', itemCount: 0 }), 'loading');
  assert.equal(resolveVisitHistoryTableState({ loading: false, error: 'Failed', itemCount: 2 }), 'error');
  assert.equal(resolveVisitHistoryTableState({ loading: false, error: '', itemCount: 0 }), 'empty');
  assert.equal(resolveVisitHistoryTableState({ loading: false, error: '', itemCount: 2 }), 'ready');
});
