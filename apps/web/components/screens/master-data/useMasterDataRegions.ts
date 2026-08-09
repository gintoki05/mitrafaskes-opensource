'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MasterDataRegionsResponse,
  RegionLevel,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

export interface MasterDataRegionQuery {
  level: RegionLevel;
  parentCode?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const emptyData: MasterDataRegionsResponse = {
  items: [],
  meta: { page: 1, pageSize: 50, total: 0 },
};

async function readError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    return new Error(message || 'Data Master Wilayah tidak dapat dimuat.');
  } catch {
    return new Error('Data Master Wilayah tidak dapat dimuat.');
  }
}

export function useMasterDataRegions(query: MasterDataRegionQuery) {
  const [data, setData] = useState<MasterDataRegionsResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queryKey = JSON.stringify(query);
  const serializedQuery = useMemo(() => {
    const params = new URLSearchParams();
    const current = JSON.parse(queryKey) as MasterDataRegionQuery;
    for (const [key, value] of Object.entries(current)) {
      if (value === undefined || value === '') continue;
      params.set(key, String(value));
    }
    return params.toString();
  }, [queryKey]);

  const request = useCallback(
    async (signal?: AbortSignal) => {
      const response = await apiFetch(
        `/api/master-data/regions?${serializedQuery}`,
        { signal },
      );
      if (!response.ok) throw await readError(response);
      return (await response.json()) as MasterDataRegionsResponse;
    },
    [serializedQuery],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await request());
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Data Master Wilayah tidak dapat dimuat.',
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
      try {
        const next = await request(controller.signal);
        if (!controller.signal.aborted) setData(next);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Data Master Wilayah tidak dapat dimuat.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    });
    return () => controller.abort();
  }, [request]);

  return { ...data, loading, error, refresh };
}
