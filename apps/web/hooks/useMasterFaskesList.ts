'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MasterDataListMeta,
  MasterDataListQuery,
  MasterDataListResponse,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

const emptyMeta: MasterDataListMeta = {
  page: 1,
  pageSize: 25,
  total: 0,
};

function readError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    return new Error(message || fallback);
  } catch {
    return new Error(fallback);
  }
}

function queryString(query: MasterDataListQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    params.set(key, String(value));
  }

  return params.toString();
}

export function useMasterFaskesList<T>(
  endpoint: string,
  query: MasterDataListQuery,
) {
  const [data, setData] = useState<MasterDataListResponse<T>>({
    items: [],
    meta: emptyMeta,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryKey = JSON.stringify(query);
  const serializedQuery = useMemo(
    () => queryString(JSON.parse(queryKey) as MasterDataListQuery),
    [queryKey],
  );

  const request = useCallback(async (): Promise<MasterDataListResponse<T>> => {
    const suffix = serializedQuery ? `?${serializedQuery}` : '';
    const response = await apiFetch(`/api/master/${endpoint}${suffix}`);
    if (!response.ok) {
      throw await readApiError(response, 'Data master tidak dapat dimuat.');
    }
    return (await response.json()) as MasterDataListResponse<T>;
  }, [endpoint, serializedQuery]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setData(await request());
    } catch (requestError) {
      setError(readError(requestError, 'Data master tidak dapat dimuat.'));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setLoading(true);
      setError('');
      try {
        const nextData = await request();
        if (!cancelled) setData(nextData);
      } catch (requestError) {
        if (!cancelled) {
          setError(readError(requestError, 'Data master tidak dapat dimuat.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [request]);

  return {
    ...data,
    loading,
    error,
    refresh,
  };
}

