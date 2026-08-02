'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { apiFetch } from '@/lib/auth';
import { Encounter, Icd10Entry } from '@/lib/clinical-types';

type RmeResourcesState = {
  encounters: Encounter[];
  selectedEncounter: Encounter | null;
  encountersLoading: boolean;
  loadError: string;
  icdResults: Icd10Entry[];
};

type RmeResourcesAction =
  | { type: 'encounters-loading' }
  | { type: 'encounters-loaded'; encounters: Encounter[] }
  | { type: 'encounters-failed'; error: string }
  | { type: 'select-encounter'; encounter: Encounter }
  | { type: 'icd-loaded'; results: Icd10Entry[] };

const initialState: RmeResourcesState = {
  encounters: [],
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
      const selectedEncounter = state.selectedEncounter
        ? action.encounters.find((encounter) => encounter.id === state.selectedEncounter?.id) ?? action.encounters[0] ?? null
        : action.encounters[0] ?? null;
      return {
        ...state,
        encounters: action.encounters,
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

async function requestEncounters(): Promise<Encounter[]> {
  const response = await apiFetch('/api/encounters');
  if (!response.ok) throw new Error('Antrean pasien tidak dapat dimuat.');
  return response.json() as Promise<Encounter[]>;
}

async function requestIcd10(query: string): Promise<Icd10Entry[]> {
  const response = await apiFetch(
    `/api/master/icd10?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) throw new Error('Referensi ICD-10 tidak dapat dimuat.');
  return response.json() as Promise<Icd10Entry[]>;
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
        const encounters = await requestEncounters();
        if (active) dispatch({ type: 'encounters-loaded', encounters });
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

  const refreshEncounters = useCallback(async () => {
    dispatch({ type: 'encounters-loading' });
    try {
      dispatch({ type: 'encounters-loaded', encounters: await requestEncounters() });
    } catch (error) {
      dispatch({
        type: 'encounters-failed',
        error: messageFrom(error, 'Antrean pasien tidak dapat dimuat.'),
      });
    }
  }, []);

  const searchIcd10 = useCallback(async (query: string) => {
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
