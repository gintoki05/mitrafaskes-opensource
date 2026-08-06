'use client';

import { useCallback } from 'react';
import type {
  SatusehatLocationImportRequest,
  SatusehatLocationLinkRequest,
  SatusehatLocationMutationResponse,
  SatusehatLocationSearchQuery,
  SatusehatLocationSearchResponse,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

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
          .map((issue) => issue?.message)
          .filter((issue): issue is string => Boolean(issue))
      : [];
    return new Error(details.join(' ') || message || fallback);
  } catch {
    return new Error(fallback);
  }
}

function searchQuery(input: SatusehatLocationSearchQuery): string {
  const params = new URLSearchParams();
  if (input.id) params.set('id', input.id);
  if (input.identifier) params.set('identifier', input.identifier);
  if (input.name) params.set('name', input.name);
  if (input.organization) params.set('organization', input.organization);
  if (input.organizationLocalId) {
    params.set('organizationLocalId', input.organizationLocalId);
  }
  return params.toString();
}

export function useSatusehatLocations() {
  const search = useCallback(
    async (
      input: SatusehatLocationSearchQuery,
    ): Promise<SatusehatLocationSearchResponse> => {
      const response = await apiFetch(
        `/api/master/locations/satusehat/search?${searchQuery(input)}`,
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Location SATUSEHAT tidak dapat dicari.',
        );
      }
      return response.json() as Promise<SatusehatLocationSearchResponse>;
    },
    [],
  );

  const linkExisting = useCallback(
    async (
      localResourceId: string,
      input: SatusehatLocationLinkRequest,
    ): Promise<SatusehatLocationMutationResponse> => {
      const response = await apiFetch(
        `/api/master/locations/${localResourceId}/satusehat/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Location SATUSEHAT tidak dapat dihubungkan.',
        );
      }
      return response.json() as Promise<SatusehatLocationMutationResponse>;
    },
    [],
  );

  const importLocation = useCallback(
    async (
      input: SatusehatLocationImportRequest,
    ): Promise<SatusehatLocationMutationResponse> => {
      const response = await apiFetch('/api/master/locations/satusehat/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readApiError(
          response,
          'Location SATUSEHAT tidak dapat diimpor.',
        );
      }
      return response.json() as Promise<SatusehatLocationMutationResponse>;
    },
    [],
  );

  return { search, linkExisting, importLocation };
}
