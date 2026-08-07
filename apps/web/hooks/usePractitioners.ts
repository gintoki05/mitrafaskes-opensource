'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type {
  MasterDataListQuery,
  MasterDataListResponse,
  PractitionerCreateRequest,
  PractitionerSummary,
  SatusehatPractitionerLookupQuery,
  SatusehatPractitionerLinkRequest,
  SatusehatPractitionerMutationResponse,
  SatusehatPractitionerRemoteSummary,
  SatusehatPractitionerSearchResponse,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type State = {
  data: MasterDataListResponse<PractitionerSummary>;
  loading: boolean;
  error: string;
};

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; data: MasterDataListResponse<PractitionerSummary> }
  | { type: 'failed'; error: string };

const initialState: State = {
  data: { items: [], meta: { page: 1, pageSize: 25, total: 0 } },
  loading: true,
  error: '',
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: '' };
    case 'loaded':
      return { data: action.data, loading: false, error: '' };
    case 'failed':
      return { ...state, loading: false, error: action.error };
  }
}

type ApiErrorPayload = {
  message?: string | string[];
  errors?: { message?: string }[];
};

async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    const details = Array.isArray(payload.errors)
      ? payload.errors
          .map((issue) => issue.message)
          .filter((issue): issue is string => Boolean(issue))
      : [];
    return new Error(details.join(' ') || message || fallback);
  } catch {
    return new Error(fallback);
  }
}

function queryString(query: MasterDataListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export function usePractitioners(query?: MasterDataListQuery) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const serializedQuery = useMemo(
    () => (query ? queryString(query) : ''),
    [query],
  );

  const request = useCallback(async () => {
    const suffix = serializedQuery ? `?${serializedQuery}` : '';
    const response = await apiFetch(`/api/practitioners${suffix}`);
    if (!response.ok) {
      throw await readApiError(response, 'Data Practitioner tidak dapat dimuat.');
    }
    return response.json() as Promise<MasterDataListResponse<PractitionerSummary>>;
  }, [serializedQuery]);

  const refresh = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      dispatch({ type: 'loaded', data: await request() });
    } catch (error) {
      dispatch({
        type: 'failed',
        error:
          error instanceof Error
            ? error.message
            : 'Data Practitioner tidak dapat dimuat.',
      });
    }
  }, [request]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    void (async () => {
      dispatch({ type: 'loading' });
      try {
        const data = await request();
        if (!cancelled) dispatch({ type: 'loaded', data });
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: 'failed',
            error:
              error instanceof Error
                ? error.message
                : 'Data Practitioner tidak dapat dimuat.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, request]);

  const searchSatusehat = useCallback(
    async (localResourceId: string): Promise<SatusehatPractitionerSearchResponse> => {
      const response = await apiFetch(
        `/api/practitioners/${localResourceId}/satusehat/search`,
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Practitioner SATUSEHAT tidak dapat dicari.',
        );
      }
      return response.json() as Promise<SatusehatPractitionerSearchResponse>;
    },
    [],
  );

  const lookupSatusehat = useCallback(
    async (
      query: SatusehatPractitionerLookupQuery,
    ): Promise<SatusehatPractitionerSearchResponse> => {
      const params = new URLSearchParams({
        identifierType: query.identifierType,
        identifier: query.identifier,
      });
      const response = await apiFetch(
        `/api/practitioners/satusehat/lookup?${params.toString()}`,
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Practitioner SATUSEHAT tidak dapat dicari.',
        );
      }
      return response.json() as Promise<SatusehatPractitionerSearchResponse>;
    },
    [],
  );

  const create = useCallback(
    async (input: PractitionerCreateRequest): Promise<PractitionerSummary> => {
      const response = await apiFetch('/api/practitioners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readApiError(
          response,
          'Practitioner tidak dapat ditambahkan.',
        );
      }
      return response.json() as Promise<PractitionerSummary>;
    },
    [],
  );

  const linkExisting = useCallback(
    async (
      localResourceId: string,
      input: SatusehatPractitionerLinkRequest,
    ): Promise<SatusehatPractitionerMutationResponse> => {
      const response = await apiFetch(
        `/api/practitioners/${localResourceId}/satusehat/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Practitioner SATUSEHAT tidak dapat dihubungkan.',
        );
      }
      return response.json() as Promise<SatusehatPractitionerMutationResponse>;
    },
    [],
  );

  const update = useCallback(
    async (
      localResourceId: string,
      input: {
        nik?: string | null;
        birthDate?: string | null;
        gender?: string | null;
        organizationId?: string | null;
        locationId?: string | null;
        active?: boolean;
      },
    ): Promise<PractitionerSummary> => {
      const response = await apiFetch(`/api/practitioners/${localResourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readApiError(
          response,
          'Profil Practitioner tidak dapat diperbarui.',
        );
      }
      return response.json() as Promise<PractitionerSummary>;
    },
    [],
  );

  return {
    ...state,
    ...state.data,
    refresh,
    create,
    searchSatusehat,
    lookupSatusehat,
    linkExisting,
    update,
  };
}

export type { SatusehatPractitionerRemoteSummary };
