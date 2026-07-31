'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { apiFetch } from '@/lib/auth';
import { Encounter, Patient } from '@/lib/clinical-types';

type RegistrationDataState = {
  patients: Patient[];
  encounters: Encounter[];
  patientsLoading: boolean;
  encountersLoading: boolean;
  patientsError: string;
  encountersError: string;
};

type RegistrationDataAction =
  | { type: 'patients-loading' }
  | { type: 'patients-loaded'; patients: Patient[] }
  | { type: 'patients-failed'; error: string }
  | { type: 'encounters-loading' }
  | { type: 'encounters-loaded'; encounters: Encounter[] }
  | { type: 'encounters-failed'; error: string }
  | {
      type: 'initial-load-complete';
      patients: Patient[];
      encounters: Encounter[];
      patientsError: string;
      encountersError: string;
    };

const initialState: RegistrationDataState = {
  patients: [],
  encounters: [],
  patientsLoading: true,
  encountersLoading: true,
  patientsError: '',
  encountersError: '',
};

function registrationDataReducer(
  state: RegistrationDataState,
  action: RegistrationDataAction,
): RegistrationDataState {
  switch (action.type) {
    case 'patients-loading':
      return { ...state, patientsLoading: true, patientsError: '' };
    case 'patients-loaded':
      return { ...state, patients: action.patients, patientsLoading: false, patientsError: '' };
    case 'patients-failed':
      return { ...state, patientsLoading: false, patientsError: action.error };
    case 'encounters-loading':
      return { ...state, encountersLoading: true, encountersError: '' };
    case 'encounters-loaded':
      return { ...state, encounters: action.encounters, encountersLoading: false, encountersError: '' };
    case 'encounters-failed':
      return { ...state, encountersLoading: false, encountersError: action.error };
    case 'initial-load-complete':
      return {
        patients: action.patients,
        encounters: action.encounters,
        patientsLoading: false,
        encountersLoading: false,
        patientsError: action.patientsError,
        encountersError: action.encountersError,
      };
  }
}

async function requestPatients(query = ''): Promise<Patient[]> {
  const response = await apiFetch(
    `http://localhost:4000/api/patients?search=${encodeURIComponent(query)}`,
  );
  if (!response.ok) throw new Error('Daftar pasien tidak dapat dimuat.');
  return response.json() as Promise<Patient[]>;
}

async function requestEncounters(): Promise<Encounter[]> {
  const response = await apiFetch('http://localhost:4000/api/encounters');
  if (!response.ok) throw new Error('Antrean rawat jalan tidak dapat dimuat.');
  return response.json() as Promise<Encounter[]>;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useRegistrationData() {
  const [state, dispatch] = useReducer(registrationDataReducer, initialState);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const [patientsResult, encountersResult] = await Promise.allSettled([
        requestPatients(),
        requestEncounters(),
      ]);
      if (!active) return;

      dispatch({
        type: 'initial-load-complete',
        patients: patientsResult.status === 'fulfilled' ? patientsResult.value : [],
        encounters: encountersResult.status === 'fulfilled' ? encountersResult.value : [],
        patientsError:
          patientsResult.status === 'rejected'
            ? messageFrom(patientsResult.reason, 'Daftar pasien tidak dapat dimuat.')
            : '',
        encountersError:
          encountersResult.status === 'rejected'
            ? messageFrom(encountersResult.reason, 'Antrean rawat jalan tidak dapat dimuat.')
            : '',
      });
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  const refreshPatients = useCallback(async (query = '') => {
    dispatch({ type: 'patients-loading' });
    try {
      dispatch({ type: 'patients-loaded', patients: await requestPatients(query) });
    } catch (error) {
      dispatch({
        type: 'patients-failed',
        error: messageFrom(error, 'Daftar pasien tidak dapat dimuat.'),
      });
    }
  }, []);

  const refreshEncounters = useCallback(async () => {
    dispatch({ type: 'encounters-loading' });
    try {
      dispatch({ type: 'encounters-loaded', encounters: await requestEncounters() });
    } catch (error) {
      dispatch({
        type: 'encounters-failed',
        error: messageFrom(error, 'Antrean rawat jalan tidak dapat dimuat.'),
      });
    }
  }, []);

  return { ...state, refreshPatients, refreshEncounters };
}
