'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type {
  AccountAuditItem,
  AccountListResponse,
  AccountMutationResponse,
  AccountSummary,
  WorkProfileType,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type State = { data: AccountListResponse; loading: boolean; error: string };
type Action =
  | { type: 'loading' }
  | { type: 'loaded'; data: AccountListResponse }
  | { type: 'failed'; error: string };

const initialState: State = {
  data: { items: [], meta: { page: 1, pageSize: 25, total: 0 }, statusCounts: { active: 0, inactive: 0 } },
  loading: true,
  error: '',
};

function reducer(state: State, action: Action): State {
  if (action.type === 'loading') return { ...state, loading: true, error: '' };
  if (action.type === 'loaded') return { data: action.data, loading: false, error: '' };
  return { ...state, loading: false, error: action.error };
}

type Query = { search?: string; active?: boolean; accessRoleId?: string; workProfileType?: WorkProfileType; page?: number; pageSize?: number };

export function useAccounts(query: Query) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const serializedQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
    return params.toString();
  }, [query]);

  const readError = useCallback(async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as { message?: string; code?: string };
      return new Error(payload.message || fallback);
    } catch { return new Error(fallback); }
  }, []);

  const request = useCallback(async () => {
    const response = await apiFetch(`/api/accounts${serializedQuery ? `?${serializedQuery}` : ''}`);
    if (!response.ok) throw await readError(response, 'Daftar akun tidak dapat dimuat.');
    return response.json() as Promise<AccountListResponse>;
  }, [readError, serializedQuery]);

  const refresh = useCallback(async () => {
    dispatch({ type: 'loading' });
    try { dispatch({ type: 'loaded', data: await request() }); }
    catch (error) { dispatch({ type: 'failed', error: error instanceof Error ? error.message : 'Daftar akun tidak dapat dimuat.' }); }
  }, [request]);

  useEffect(() => { let cancelled = false; dispatch({ type: 'loading' }); void request().then((data) => { if (!cancelled) dispatch({ type: 'loaded', data }); }).catch((error) => { if (!cancelled) dispatch({ type: 'failed', error: error instanceof Error ? error.message : 'Daftar akun tidak dapat dimuat.' }); }); return () => { cancelled = true; }; }, [request]);

  const mutate = useCallback(async (path: string, init?: RequestInit): Promise<AccountMutationResponse | AccountSummary> => {
    const response = await apiFetch(path, init);
    if (!response.ok) throw await readError(response, 'Perubahan akun gagal.');
    return response.json() as Promise<AccountMutationResponse>;
  }, [readError]);

  const create = useCallback((input: unknown) => mutate('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }), [mutate]);
  const update = useCallback((id: string, input: unknown) => mutate(`/api/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }), [mutate]);
  const setActive = useCallback((id: string, active: boolean) => mutate(`/api/accounts/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' }), [mutate]);
  const resetPassword = useCallback((id: string) => mutate(`/api/accounts/${id}/reset-password`, { method: 'POST' }), [mutate]);
  const getAudit = useCallback(async (id: string): Promise<AccountAuditItem[]> => { const response = await apiFetch(`/api/accounts/${id}/audit`); if (!response.ok) throw await readError(response, 'Audit akun tidak dapat dimuat.'); return response.json() as Promise<AccountAuditItem[]>; }, [readError]);

  return { ...state, ...state.data, refresh, create, update, setActive, resetPassword, getAudit };
}

export type AccountQuery = Query;
