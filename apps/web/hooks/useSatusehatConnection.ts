'use client';

import { useEffect, useState } from 'react';
import type {
  IntegrationConnectionSummary,
  IntegrationProviderStatus,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';
import { useSession } from './useSession';

export type SatusehatConnectionDisplayStatus =
  | 'LOADING'
  | 'UNAVAILABLE'
  | IntegrationProviderStatus;

type SatusehatConnectionState = {
  sessionId: string;
  status: SatusehatConnectionDisplayStatus;
};

async function requestSatusehatConnection(): Promise<IntegrationConnectionSummary> {
  const response = await apiFetch(
    '/api/integrations/SATUSEHAT/connection-status',
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error(`Status koneksi SATUSEHAT tidak tersedia (HTTP ${response.status})`);
  }
  return (await response.json()) as IntegrationConnectionSummary;
}

export function useSatusehatConnection(): SatusehatConnectionDisplayStatus {
  const session = useSession();
  const sessionId = session?.user.id;
  const [connectionState, setConnectionState] =
    useState<SatusehatConnectionState>();

  useEffect(() => {
    let active = true;

    if (!sessionId) {
      return () => {
        active = false;
      };
    }

    void requestSatusehatConnection()
      .then((connection) => {
        if (active) {
          setConnectionState({ sessionId, status: connection.status });
        }
      })
      .catch(() => {
        if (active) {
          setConnectionState({ sessionId, status: 'UNAVAILABLE' });
        }
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  if (!sessionId || connectionState?.sessionId !== sessionId) return 'LOADING';
  return connectionState.status;
}
