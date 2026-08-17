'use client';

import { useCallback, useEffect, useReducer } from 'react';
import type {
  EncounterListResponse,
  ListMeta,
  MasterDataIcd10Response,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';
import { Encounter, Icd10Entry } from '@/lib/clinical-types';
import { reconcileRmeSelection } from '@/components/screens/rme/rme-selection-model';

type RmeResourcesState = {
  encounters: Encounter[];
  encountersMeta: ListMeta;
  selectedEncounter: Encounter | null;
  encountersLoading: boolean;
  loadError: string;
  icdResults: Icd10Entry[];
};

type RmeResourcesAction =
  | { type: 'encounters-loading' }
  | {
      type: 'encounters-loaded';
      response: EncounterListResponse;
      retainMissingSelection?: boolean;
    }
  | { type: 'encounters-failed'; error: string }
  | { type: 'select-encounter'; encounter: Encounter }
  | { type: 'icd-loaded'; results: Icd10Entry[] };

const initialState: RmeResourcesState = {
  encounters: [],
  encountersMeta: { page: 1, pageSize: 25, total: 0 },
  selectedEncounter: null,
  encountersLoading: true,
  loadError: '',
  icdResults: [],
};

function rmeResourcesReducer(state: RmeResourcesState, action: RmeResourcesAction): RmeResourcesState {
  switch (action.type) {
    case 'encounters-loading':
      return { ...state, encountersLoading: true, loadError: '' };
    case 'encounters-loaded': {
      const selectedEncounter = reconcileRmeSelection(
        state.selectedEncounter,
        action.response.items,
        action.retainMissingSelection ?? false,
      );
      return {
        ...state,
        encounters: action.response.items,
        encountersMeta: action.response.meta,
        selectedEncounter,
        encountersLoading: false,
        loadError: '',
      };
    }
    case 'encounters-failed':
      return { ...state, encountersLoading: false, loadError: action.error };
    case 'select-encounter':
      return { ...state, selectedEncounter: action.encounter };
    case 'icd-loaded':
      return { ...state, icdResults: action.results };
  }
}

async function requestEncounters(page = 1): Promise<EncounterListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    statuses: 'arrived,in-progress,onleave',
  });
  const response = await apiFetch(`/api/encounters?${params.toString()}`);
  if (!response.ok) throw new Error('Antrean pasien tidak dapat dimuat.');
  return response.json() as Promise<EncounterListResponse>;
}

async function requestIcd10(query: string): Promise<Icd10Entry[]> {
  const response = await apiFetch(
    `/api/master-data/icd10?q=${encodeURIComponent(query)}&page=1&pageSize=50`,
  );
  if (!response.ok) throw new Error('Referensi ICD-10 tidak dapat dimuat.');
  const payload = (await response.json()) as MasterDataIcd10Response;
  return payload.items.map(({ code, display, nameIndo, nameEng }) => ({
    code,
    display,
    nameIndo,
    nameEng,
  }));
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useRmeResources() {
  const [state, dispatch] = useReducer(rmeResourcesReducer, initialState);

  useEffect(() => {
    let active = true;

    async function loadInitialEncounters() {
      try {
        const response = await requestEncounters();
        if (active) dispatch({ type: 'encounters-loaded', response });
      } catch (error) {
        if (active) {
          dispatch({
            type: 'encounters-failed',
            error: messageFrom(error, 'Antrean pasien tidak dapat dimuat.'),
          });
        }
      }
    }

    void loadInitialEncounters();
    return () => {
      active = false;
    };
  }, []);

  const refreshEncounters = useCallback(async (
    page = 1,
    options: { retainMissingSelection?: boolean } = {},
  ) => {
    dispatch({ type: 'encounters-loading' });
    try {
      dispatch({
        type: 'encounters-loaded',
        response: await requestEncounters(page),
        retainMissingSelection: options.retainMissingSelection,
      });
    } catch (error) {
      dispatch({
        type: 'encounters-failed',
        error: messageFrom(error, 'Antrean pasien tidak dapat dimuat.'),
      });
    }
  }, []);

  const searchIcd10 = useCallback(async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'icd-loaded', results: [] });
      return;
    }
    try {
      dispatch({ type: 'icd-loaded', results: await requestIcd10(query) });
    } catch {
      dispatch({ type: 'icd-loaded', results: [] });
    }
  }, []);

  const selectEncounter = useCallback((encounter: Encounter) => {
    dispatch({ type: 'select-encounter', encounter });
  }, []);

  return { ...state, refreshEncounters, searchIcd10, selectEncounter };
}
