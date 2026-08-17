'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  EncounterHistoryListResponse,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';
import type { VisitHistoryQuery, VisitHistoryState } from './types';
import { serializeVisitHistoryQuery } from './visit-history-query';

const emptyResponse = (): EncounterHistoryListResponse => ({
  items: [],
  meta: { page: 1, pageSize: 25, total: 0 },
});

type ApiErrorPayload = {
  message?: string | string[];
  errors?: Array<{ message?: string }>;
  issues?: Array<{ message?: string }>;
};

async function readApiError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    const issues = payload.issues ?? payload.errors;
    const details = issues
      ?.map((issue) => issue.message)
      .filter((issue): issue is string => Boolean(issue))
      .join(' ');
    return new Error(
      details || message || 'Riwayat kunjungan tidak dapat dimuat.',
    );
  } catch {
    return new Error('Riwayat kunjungan tidak dapat dimuat.');
  }
}

async function requestVisitHistory(
  query: VisitHistoryQuery,
): Promise<EncounterHistoryListResponse> {
  const response = await apiFetch(
    `/api/encounters/history?${serializeVisitHistoryQuery(query)}`,
  );
  if (!response.ok) throw await readApiError(response);
  return response.json() as Promise<EncounterHistoryListResponse>;
}

export function useVisitHistory(query: VisitHistoryQuery) {
  const [state, setState] = useState<VisitHistoryState>({
    data: emptyResponse(),
    loading: true,
    error: '',
  });
  const request = useCallback(async () => {
    return requestVisitHistory(query);
  }, [query]);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      setState({ data: await request(), loading: false, error: '' });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Riwayat kunjungan tidak dapat dimuat.',
      }));
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: '' }));
    void request()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Riwayat kunjungan tidak dapat dimuat.',
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  return { ...state, refresh };
}
