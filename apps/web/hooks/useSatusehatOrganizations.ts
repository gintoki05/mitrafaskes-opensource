'use client';

import { useCallback } from 'react';
import type {
  SatusehatOrganizationImportRequest,
  SatusehatOrganizationLinkRequest,
  SatusehatOrganizationMutationResponse,
  SatusehatOrganizationSearchQuery,
  SatusehatOrganizationSearchResponse,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

async function readApiError(response: Response, fallback: string): Promise<Error> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    return new Error(message || fallback);
  } catch {
    return new Error(fallback);
  }
}

function searchQuery(input: SatusehatOrganizationSearchQuery): string {
  const params = new URLSearchParams();
  if (input.id) params.set('id', input.id);
  if (input.name) params.set('name', input.name);
  if (input.partOf) params.set('partof', input.partOf);
  if (input.parentLocalId) params.set('parentLocalId', input.parentLocalId);
  return params.toString();
}

export function useSatusehatOrganizations() {
  const search = useCallback(
    async (
      input: SatusehatOrganizationSearchQuery,
    ): Promise<SatusehatOrganizationSearchResponse> => {
      const query = searchQuery(input);
      const response = await apiFetch(
        `/api/master/organizations/satusehat/search?${query}`,
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Organization SATUSEHAT tidak dapat dicari.',
        );
      }
      return response.json() as Promise<SatusehatOrganizationSearchResponse>;
    },
    [],
  );

  const linkExisting = useCallback(
    async (
      localResourceId: string,
      input: SatusehatOrganizationLinkRequest,
    ): Promise<SatusehatOrganizationMutationResponse> => {
      const response = await apiFetch(
        `/api/master/organizations/${localResourceId}/satusehat/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Organization SATUSEHAT tidak dapat dihubungkan.',
        );
      }
      return response.json() as Promise<SatusehatOrganizationMutationResponse>;
    },
    [],
  );

  const importOrganization = useCallback(
    async (
      input: SatusehatOrganizationImportRequest,
    ): Promise<SatusehatOrganizationMutationResponse> => {
      const response = await apiFetch('/api/master/organizations/satusehat/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readApiError(
          response,
          'Organization SATUSEHAT tidak dapat diimpor.',
        );
      }
      return response.json() as Promise<SatusehatOrganizationMutationResponse>;
    },
    [],
  );

  return { search, linkExisting, importOrganization };
}
