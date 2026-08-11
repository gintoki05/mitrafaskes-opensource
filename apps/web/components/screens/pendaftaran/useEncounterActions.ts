'use client';

import { useCallback } from 'react';
import type {
  CreateEncounterDto,
  Encounter,
  EncounterStatus,
  UpdateEncounterStatusDto,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

export type EncounterApiError = Error & {
  code?: string;
  status?: number;
};

type ApiErrorPayload = {
  code?: string;
  message?: string | string[];
  errors?: Array<{ message?: string }>;
};

async function readApiError(
  response: Response,
  fallback: string,
): Promise<EncounterApiError> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // Keep the HTTP status available even when the API has no JSON body.
  }

  const message = Array.isArray(payload.message)
    ? payload.message.join(' ')
    : payload.message;
  const details = Array.isArray(payload.errors)
    ? payload.errors
        .map((issue) => issue.message)
        .filter((issue): issue is string => Boolean(issue))
        .join(' ')
    : '';
  const error = new Error(details || message || fallback) as EncounterApiError;
  error.code = payload.code;
  error.status = response.status;
  return error;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) throw await readApiError(response, fallback);
  return response.json() as Promise<T>;
}

export function useEncounterActions() {
  const create = useCallback((input: CreateEncounterDto) => {
    return requestJson<Encounter>(
      '/api/encounters',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      'Pasien belum dapat dimasukkan ke antrean.',
    );
  }, []);

  const updateStatus = useCallback(
    (id: string, status: EncounterStatus, expectedVersion: number) => {
      const input: UpdateEncounterStatusDto = { status, expectedVersion };
      return requestJson<Encounter>(
        `/api/encounters/${id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
        'Status kunjungan belum dapat diperbarui.',
      );
    },
    [],
  );

  return { create, updateStatus };
}
