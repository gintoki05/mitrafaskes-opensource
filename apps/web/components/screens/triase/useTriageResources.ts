'use client';

import { useCallback, useEffect, useReducer } from 'react';
import type { EncounterListResponse, ListMeta } from '@mitrafaskes/shared';
import type { Encounter } from '@/lib/clinical-types';
import { apiFetch } from '@/lib/auth';

type State = { encounters: Encounter[]; meta: ListMeta; selected: Encounter | null; loading: boolean; error: string };
type Action =
  | { type: 'loading' }
  | { type: 'loaded'; response: EncounterListResponse }
  | { type: 'failed'; error: string }
  | { type: 'select'; encounter: Encounter };

const initialState: State = { encounters: [], meta: { page: 1, pageSize: 25, total: 0 }, selected: null, loading: true, error: '' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading': return { ...state, loading: true, error: '' };
    case 'loaded': {
      const selected = state.selected ? action.response.items.find((item) => item.id === state.selected?.id) ?? null : action.response.items[0] ?? null;
      return { ...state, encounters: action.response.items, meta: action.response.meta, selected, loading: false, error: '' };
    }
    case 'failed': return { ...state, loading: false, error: action.error };
    case 'select': return { ...state, selected: action.encounter };
  }
}

export function useTriageResources() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refresh = useCallback(async (page = 1) => {
    dispatch({ type: 'loading' });
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        statuses: 'WAITING,IN_PROGRESS',
        triageStatuses: 'NOT_STARTED,DRAFT',
      });
      const response = await apiFetch(`/api/encounters?${params.toString()}`);
      if (!response.ok) throw new Error('Antrean triase tidak dapat dimuat.');
      dispatch({ type: 'loaded', response: await response.json() as EncounterListResponse });
    } catch (error) {
      dispatch({ type: 'failed', error: error instanceof Error ? error.message : 'Antrean triase tidak dapat dimuat.' });
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const select = useCallback((encounter: Encounter) => dispatch({ type: 'select', encounter }), []);
  return { ...state, refresh, select };
}
