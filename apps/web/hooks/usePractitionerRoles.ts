'use client';

import { useCallback, useEffect, useReducer } from 'react';
import type {
  PractitionerRoleListResponse,
  PractitionerRoleOption,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type State = {
  roles: PractitionerRoleOption[];
  loading: boolean;
  error: string;
};

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; roles: PractitionerRoleOption[] }
  | { type: 'failed'; error: string };

const initialState: State = { roles: [], loading: true, error: '' };

function reducer(state: State, action: Action): State {
  if (action.type === 'loading') return { ...state, loading: true, error: '' };
  if (action.type === 'loaded') {
    return { roles: action.roles, loading: false, error: '' };
  }
  return { ...state, loading: false, error: action.error };
}

async function readError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    return new Error(message || 'Role Practitioner tidak dapat dimuat.');
  } catch {
    return new Error('Role Practitioner tidak dapat dimuat.');
  }
}

export function usePractitionerRoles() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    dispatch({ type: 'loading' });
    try {
      const response = await apiFetch('/api/practitioners/roles', { signal });
      if (!response.ok) throw await readError(response);
      const result = (await response.json()) as PractitionerRoleListResponse;
      if (!signal?.aborted) dispatch({ type: 'loaded', roles: result.items });
    } catch (error) {
      if (!signal?.aborted) {
        dispatch({
          type: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Role Practitioner tidak dapat dimuat.',
        });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { ...state, refresh };
}
