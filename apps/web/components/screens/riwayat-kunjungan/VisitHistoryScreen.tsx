'use client';

import { useMemo, useState, type SubmitEvent } from 'react';
import { CalendarClock } from 'lucide-react';
import { AccessPermission, type Encounter } from '@mitrafaskes/shared';
import { PageHeader } from '@/components/PageHeader';
import { RouteGuard } from '@/components/RouteGuard';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { useEncounterActions } from '@/hooks/useEncounterActions';
import { useSession } from '@/hooks/useSession';
import { can } from '@/lib/auth';
import { EncounterSyncDialog } from '../encounters/EncounterSyncDialog';
import { shouldRefreshEncounterListAfterSync } from '../encounters/encounter-sync-state';
import {
  defaultVisitHistoryFilters,
  VISIT_HISTORY_PAGE_SIZE,
} from './constants';
import { VisitHistoryDetailDialog } from './VisitHistoryDetailDialog';
import { VisitHistoryFilters } from './VisitHistoryFilters';
import { VisitHistoryTable } from './VisitHistoryTable';
import { useVisitHistory } from './useVisitHistory';
import { toHistoryApiQuery } from './visit-history-query';
import { updateVisitHistoryFilters } from './visit-history-state';
import type { VisitHistoryFilters as VisitHistoryFiltersValue } from './types';

export default function VisitHistoryScreen() {
  const session = useSession();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const currentUser = session?.user ?? null;
  const canSyncEncounter = can(currentUser, AccessPermission.SYNC_RETRY);
  const [filters, setFilters] = useState<VisitHistoryFiltersValue>(() => defaultVisitHistoryFilters());
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [detailEncounter, setDetailEncounter] = useState<Encounter | null>(null);
  const [syncingEncounter, setSyncingEncounter] = useState<Encounter | null>(null);
  const encounterActions = useEncounterActions();
  const query = useMemo(
    () => toHistoryApiQuery({ ...filters, page, pageSize: VISIT_HISTORY_PAGE_SIZE }),
    [filters, page],
  );
  const history = useVisitHistory(query);
  const defaults = useMemo(() => defaultVisitHistoryFilters(), []);
  const hasActiveFilters =
    filters.fromDate !== defaults.fromDate ||
    filters.toDate !== defaults.toDate ||
    filters.search.length > 0 ||
    filters.status !== 'ALL';

  const applyFilterChanges = (changes: Partial<VisitHistoryFiltersValue>) => {
    const next = updateVisitHistoryFilters(filters, changes);
    setFilters(next.value);
    setPage(next.page);
  };

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilterChanges({ search: searchDraft.trim() });
  };

  const clearFilters = () => {
    const next = defaultVisitHistoryFilters();
    setFilters(next);
    setSearchDraft('');
    setPage(1);
  };

  const handleSyncSettled = async (outcome: 'SUCCESS' | 'FAILED') => {
    if (shouldRefreshEncounterListAfterSync(outcome)) {
      await history.refresh();
    }
  };

  return (
    <RouteGuard permission={AccessPermission.QUEUE_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-7">
        <PageHeader
          icon={<CalendarClock className="h-6 w-6" />}
          title="Riwayat Kunjungan"
          description="Telusuri seluruh kunjungan pasien dan lifecycle Encounter berdasarkan rentang tanggal."
        />
        <VisitHistoryFilters
          value={filters}
          searchDraft={searchDraft}
          hasActiveFilters={hasActiveFilters}
          onChange={applyFilterChanges}
          onSearchChange={setSearchDraft}
          onSearchSubmit={handleSearchSubmit}
          onClear={clearFilters}
        />
        <VisitHistoryTable
          encounters={history.data.items}
          meta={history.data.meta}
          loading={history.loading}
          error={history.error}
          canSync={canSyncEncounter}
          satusehatAvailable={satusehat.available}
          onPageChange={setPage}
          onRetry={() => void history.refresh()}
          onView={setDetailEncounter}
          onSync={setSyncingEncounter}
        />
        <VisitHistoryDetailDialog
          encounter={detailEncounter}
          onClose={() => setDetailEncounter(null)}
        />
        <EncounterSyncDialog
          key={syncingEncounter?.id ?? 'visit-history-sync-closed'}
          open={satusehat.configured && Boolean(syncingEncounter)}
          encounter={syncingEncounter}
          canSync={canSyncEncounter}
          previewSatusehat={encounterActions.previewSatusehat}
          syncSatusehat={encounterActions.syncSatusehat}
          onClose={() => setSyncingEncounter(null)}
          onSettled={handleSyncSettled}
        />
      </div>
    </RouteGuard>
  );
}
