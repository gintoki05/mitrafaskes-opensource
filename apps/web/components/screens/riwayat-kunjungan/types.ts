import type {
  Encounter,
  EncounterHistoryListResponse,
  EncounterStatus,
} from '@mitrafaskes/shared';

export type VisitHistoryStatusFilter = EncounterStatus | 'ALL';

export type VisitHistoryFilters = {
  fromDate: string;
  toDate: string;
  search: string;
  status: VisitHistoryStatusFilter;
};

export type VisitHistoryQuery = {
  page: number;
  pageSize: number;
  fromDate: string;
  toDate: string;
  search?: string;
  status?: EncounterStatus;
};

export type VisitHistoryState = {
  data: EncounterHistoryListResponse;
  loading: boolean;
  error: string;
};

export type VisitHistoryTableProps = {
  encounters: Encounter[];
  meta: EncounterHistoryListResponse['meta'];
  loading: boolean;
  error: string;
  canSync: boolean;
  satusehatAvailable: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onView: (encounter: Encounter) => void;
  onSync: (encounter: Encounter) => void;
};
