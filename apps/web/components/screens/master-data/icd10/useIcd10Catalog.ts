'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/auth';
import type { Icd10CatalogData, Icd10CatalogQuery } from './types';

const emptyData: Icd10CatalogData = {
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
    return new Error(message || 'Katalog ICD-10 tidak dapat dimuat.');
  } catch {
    return new Error('Katalog ICD-10 tidak dapat dimuat.');
  }
}

export function useIcd10Catalog(query: Icd10CatalogQuery) {
  const [data, setData] = useState<Icd10CatalogData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const serializedQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (query.search) params.set('q', query.search);
    params.set('page', String(query.page));
    params.set('pageSize', String(query.pageSize));
    return params.toString();
  }, [query.page, query.pageSize, query.search]);

  const request = useCallback(
    async (signal?: AbortSignal) => {
      const response = await apiFetch(
        `/api/master-data/icd10?${serializedQuery}`,
        { signal },
      );
      if (!response.ok) throw await readError(response);
      return (await response.json()) as Icd10CatalogData;
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
          : 'Katalog ICD-10 tidak dapat dimuat.',
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
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
              : 'Katalog ICD-10 tidak dapat dimuat.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [request]);

  return { ...data, loading, error, refresh };
}
