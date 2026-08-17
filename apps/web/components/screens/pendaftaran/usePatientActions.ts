'use client';

import { useCallback } from 'react';
import type {
  CreatePatientDto,
  Patient,
  SatusehatPatientLinkRequest,
  SatusehatPatientLookupQuery,
  SatusehatPatientMutationResponse,
  SatusehatPatientPreview,
  SatusehatPatientSearchResponse,
  SatusehatPatientSyncResult,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type ApiErrorPayload = {
  message?: string | string[];
  errors?: { message?: string }[];
};

export async function readPatientApiError(
  response: Response,
  fallback: string,
): Promise<Error> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    const details = Array.isArray(payload.errors)
      ? payload.errors
          .map((issue) => issue.message)
          .filter((issue): issue is string => Boolean(issue))
      : [];
    return new Error(details.join(' ') || message || fallback);
  } catch {
    return new Error(fallback);
  }
}

export function usePatientActions() {
  const get = useCallback(async (id: string): Promise<Patient> => {
    const response = await apiFetch(`/api/patients/${id}`);
    if (!response.ok) {
      throw await readPatientApiError(
        response,
        'Detail pasien tidak dapat dimuat.',
      );
    }
    return response.json() as Promise<Patient>;
  }, []);

  const create = useCallback(async (input: CreatePatientDto): Promise<Patient> => {
    const response = await apiFetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw await readPatientApiError(
        response,
        'Pasien tidak dapat ditambahkan.',
      );
    }
    return response.json() as Promise<Patient>;
  }, []);

  const update = useCallback(
    async (id: string, input: CreatePatientDto): Promise<Patient> => {
      const response = await apiFetch(`/api/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readPatientApiError(
          response,
          'Data pasien tidak dapat diperbarui.',
        );
      }
      return response.json() as Promise<Patient>;
    },
    [],
  );

  const previewSatusehat = useCallback(
    async (id: string): Promise<SatusehatPatientPreview> => {
      const response = await apiFetch(
        `/api/integrations/SATUSEHAT/resources/Patient/${id}/preview`,
      );
      if (!response.ok) {
        throw await readPatientApiError(
          response,
          'Preview Patient SATUSEHAT tidak tersedia.',
        );
      }
      return response.json() as Promise<SatusehatPatientPreview>;
    },
    [],
  );

  const syncSatusehat = useCallback(
    async (id: string): Promise<SatusehatPatientSyncResult> => {
      const response = await apiFetch(`/api/integrations/SATUSEHAT/resources/Patient/${id}/sync`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw await readPatientApiError(
          response,
          'Patient tidak dapat disinkronkan ke SATUSEHAT.',
        );
      }
      return response.json() as Promise<SatusehatPatientSyncResult>;
    },
    [],
  );

  const lookupSatusehat = useCallback(
    async (
      query: SatusehatPatientLookupQuery,
    ): Promise<SatusehatPatientSearchResponse> => {
      const params = new URLSearchParams({
        identifierType: query.identifierType,
        identifier: query.identifier,
      });
      const response = await apiFetch(
        `/api/integrations/SATUSEHAT/resources/Patient/lookup?${params.toString()}`,
      );
      if (!response.ok) {
        throw await readPatientApiError(
          response,
          'Patient SATUSEHAT tidak dapat dicari berdasarkan NIK atau Nomor IHS.',
        );
      }
      return response.json() as Promise<SatusehatPatientSearchResponse>;
    },
    [],
  );

  const linkSatusehat = useCallback(
    async (
      id: string,
      input: SatusehatPatientLinkRequest,
    ): Promise<SatusehatPatientMutationResponse> => {
      const response = await apiFetch(`/api/integrations/SATUSEHAT/resources/Patient/${id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw await readPatientApiError(
          response,
          'Patient SATUSEHAT tidak dapat dihubungkan.',
        );
      }
      return response.json() as Promise<SatusehatPatientMutationResponse>;
    },
    [],
  );

  return {
    get,
    create,
    update,
    previewSatusehat,
    syncSatusehat,
    lookupSatusehat,
    linkSatusehat,
  };
}
