'use client';

import { useEffect, useState } from 'react';
import type { RmeAuditItem } from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

type RmeAuditState = {
  items: RmeAuditItem[];
  error: string;
  requestKey: string;
};

const initialState: RmeAuditState = {
  items: [],
  error: '',
  requestKey: '',
};

export function useRmeAudit(encounterId: string | null, open: boolean) {
  const [state, setState] = useState<RmeAuditState>(initialState);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${encounterId ?? ''}:${reloadKey}`;

  useEffect(() => {
    if (!open || !encounterId) return;

    let active = true;

    void apiFetch(`/api/rme/encounter/${encounterId}/audit`)
      .then(async (response) => {
        if (!response.ok) {
          let message = 'Riwayat edit RME tidak dapat dimuat.';
          try {
            const body = (await response.json()) as { message?: string };
            message = body.message || message;
          } catch {
            // Keep the user-facing fallback when the API has no JSON error body.
          }
          throw new Error(message);
        }
        return (await response.json()) as RmeAuditItem[];
      })
      .then((items) => {
        if (active) setState({ items, error: '', requestKey });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            items: [],
            error:
              error instanceof Error
                ? error.message
                : 'Riwayat edit RME tidak dapat dimuat.',
            requestKey,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [encounterId, open, requestKey]);

  return {
    ...state,
    loading: open && Boolean(encounterId) && state.requestKey !== requestKey,
    reload: () => setReloadKey((current) => current + 1),
  };
}
