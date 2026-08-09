'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MaritalStatusSummary } from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type MaritalStatusResponse = MaritalStatusSummary[];

export interface MaritalStatusLookupState {
  statuses: MaritalStatusResponse;
  loading: boolean;
  error: string;
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function responseMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return undefined;
  }

  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const values = message.filter((value): value is string => typeof value === 'string');
    return values.length ? values.join(' ') : undefined;
  }
  return typeof message === 'string' ? message : undefined;
}

async function requestMaritalStatuses(
  signal: AbortSignal,
): Promise<MaritalStatusResponse> {
  const response = await apiFetch('/api/master-data/marital-status', { signal });
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new Error(
      responseMessage(payload) ||
        `Lookup Status Perkawinan tidak tersedia (HTTP ${response.status}).`,
    );
  }
  if (!Array.isArray(payload)) {
    throw new Error('Lookup Status Perkawinan mengembalikan format yang tidak valid.');
  }
  return payload as MaritalStatusResponse;
}

export function useMaritalStatuses(): MaritalStatusLookupState {
  const [statuses, setStatuses] = useState<MaritalStatusResponse>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    (signal: AbortSignal) => requestMaritalStatuses(signal),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((nextStatuses) => {
        if (!controller.signal.aborted) setStatuses(nextStatuses);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setStatuses([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Lookup Status Perkawinan tidak dapat dimuat.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);

  return { statuses, loading, error };
}
