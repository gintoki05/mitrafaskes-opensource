'use client';

import { useCallback } from 'react';
import { apiFetch } from '@/lib/auth';

type ConditionApiError = Error & {
  code?: string;
  status?: number;
};

type ConditionApiErrorPayload = {
  code?: string;
  message?: string | string[];
  errors?: Array<{ message?: string }>;
  issues?: Array<{ message?: string }>;
};

async function readApiError(
  response: Response,
  fallback: string,
): Promise<ConditionApiError> {
  let payload: ConditionApiErrorPayload = {};
  try {
    payload = (await response.json()) as ConditionApiErrorPayload;
  } catch {
    // Keep the HTTP status available when the API has no JSON body.
  }

  const message = Array.isArray(payload.message)
    ? payload.message.join(' ')
    : payload.message;
  const issues = payload.issues ?? payload.errors;
  const details = Array.isArray(issues)
    ? issues
        .map((issue) => issue.message)
        .filter((issue): issue is string => Boolean(issue))
        .join(' ')
    : '';
  const error = new Error(details || message || fallback) as ConditionApiError;
  error.code = payload.code;
  error.status = response.status;
  return error;
}

export function useConditionActions() {
  const syncSatusehat = useCallback(async (id: string): Promise<void> => {
    const response = await apiFetch(
      `/api/integrations/SATUSEHAT/resources/Condition/${id}/sync`,
      { method: 'POST' },
    );
    if (!response.ok) {
      throw await readApiError(
        response,
        'Diagnosis belum dapat disinkronkan ke SATUSEHAT.',
      );
    }
  }, []);

  return { syncSatusehat };
}
