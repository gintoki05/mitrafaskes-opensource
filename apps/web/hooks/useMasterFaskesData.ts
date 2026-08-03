'use client';

import { useCallback, useEffect, useReducer } from 'react';
import {
  LocationSummary,
  MasterFaskesData,
  OrganizationSummary,
  ServiceUnitSummary,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type MasterFaskesState = {
  data: MasterFaskesData;
  loading: boolean;
  error: string;
};

type MasterFaskesAction =
  | { type: 'loading' }
  | { type: 'loaded'; data: MasterFaskesData }
  | { type: 'failed'; error: string };

const emptyData: MasterFaskesData = {
  organizations: [],
  serviceUnits: [],
  locations: [],
};

const initialState: MasterFaskesState = {
  data: emptyData,
  loading: true,
  error: '',
};

function reducer(state: MasterFaskesState, action: MasterFaskesAction): MasterFaskesState {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: '' };
    case 'loaded':
      return { data: action.data, loading: false, error: '' };
    case 'failed':
      return { ...state, loading: false, error: action.error };
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message;
    return new Error(message || fallback);
  } catch {
    return new Error(fallback);
  }
}

async function requestMasterData(): Promise<MasterFaskesData> {
  const response = await apiFetch('/api/master/faskes');
  if (!response.ok) throw await readApiError(response, 'Master faskes tidak dapat dimuat.');
  return response.json() as Promise<MasterFaskesData>;
}

async function postMasterData<T>(path: string, input: unknown): Promise<T> {
  const response = await apiFetch(`/api/master/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readApiError(response, 'Master faskes tidak dapat disimpan.');
  return response.json() as Promise<T>;
}

async function patchMasterData<T>(path: string, input: unknown): Promise<T> {
  const response = await apiFetch(`/api/master/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readApiError(response, 'Master faskes tidak dapat diperbarui.');
  return response.json() as Promise<T>;
}

export function useMasterFaskesData() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      dispatch({ type: 'loaded', data: await requestMasterData() });
    } catch (error) {
      dispatch({
        type: 'failed',
        error: errorMessage(error, 'Master faskes tidak dapat dimuat.'),
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createOrganization = useCallback(async (input: unknown): Promise<OrganizationSummary> => {
    const result = await postMasterData<OrganizationSummary>('organizations', input);
    await refresh();
    return result;
  }, [refresh]);

  const updateOrganization = useCallback(async (id: string, input: unknown): Promise<OrganizationSummary> => {
    const result = await patchMasterData<OrganizationSummary>(`organizations/${id}`, input);
    await refresh();
    return result;
  }, [refresh]);

  const createServiceUnit = useCallback(async (input: unknown): Promise<ServiceUnitSummary> => {
    const result = await postMasterData<ServiceUnitSummary>('service-units', input);
    await refresh();
    return result;
  }, [refresh]);

  const updateServiceUnit = useCallback(async (id: string, input: unknown): Promise<ServiceUnitSummary> => {
    const result = await patchMasterData<ServiceUnitSummary>(`service-units/${id}`, input);
    await refresh();
    return result;
  }, [refresh]);

  const createLocation = useCallback(async (input: unknown): Promise<LocationSummary> => {
    const result = await postMasterData<LocationSummary>('locations', input);
    await refresh();
    return result;
  }, [refresh]);

  const updateLocation = useCallback(async (id: string, input: unknown): Promise<LocationSummary> => {
    const result = await patchMasterData<LocationSummary>(`locations/${id}`, input);
    await refresh();
    return result;
  }, [refresh]);

  return {
    ...state,
    ...state.data,
    refresh,
    createOrganization,
    updateOrganization,
    createServiceUnit,
    updateServiceUnit,
    createLocation,
    updateLocation,
  };
}
