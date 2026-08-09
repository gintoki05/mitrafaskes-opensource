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

export interface MasterDataRegionsState extends MasterDataRegionsResponse {
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

function emptyData(query: MasterDataRegionQuery): MasterDataRegionsResponse {
  return {
    items: [],
    meta: { page: query.page, pageSize: query.pageSize, total: 0 },
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

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

export function useMasterDataRegions(
  query: MasterDataRegionQuery,
  options: { enabled?: boolean } = {},
): MasterDataRegionsState {
  const enabled = options.enabled ?? true;
  const currentQuery = useMemo(
    () => ({
      level: query.level,
      parentCode: query.parentCode,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    }),
    [
      query.level,
      query.parentCode,
      query.search,
      query.page,
      query.pageSize,
    ],
  );
  const serializedQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('level', query.level);
    if (query.parentCode) params.set('parentCode', query.parentCode);
    if (query.search) params.set('search', query.search);
    params.set('page', String(query.page));
    params.set('pageSize', String(query.pageSize));
    return params.toString();
  }, [query.level, query.parentCode, query.search, query.page, query.pageSize]);
  const [data, setData] = useState<MasterDataRegionsResponse>(() =>
    emptyData(query),
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

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
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      setData(await request());
    } catch (requestError) {
      if (isAbortError(requestError)) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Data Master Wilayah tidak dapat dimuat.',
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, request]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      if (!enabled) {
        setData(emptyData(currentQuery));
        setLoading(false);
        setError('');
        return;
      }

      setData(emptyData(currentQuery));
      setLoading(true);
      setError('');

      try {
        const next = await request(controller.signal);
        if (!controller.signal.aborted) setData(next);
      } catch (requestError: unknown) {
        if (!controller.signal.aborted && !isAbortError(requestError)) {
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
  }, [currentQuery, enabled, request]);

  return { ...data, loading, error, refresh };
}
