'use client';

import { useEffect, useState } from 'react';
import type { SatusehatAuthStatus } from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';

const STATUS_REFRESH_INTERVAL_MS = 60_000;

export type SatusehatConnectionDisplayStatus =
  | 'LOADING'
  | SatusehatAuthStatus['status'];

async function requestSatusehatStatus(
  signal: AbortSignal,
): Promise<SatusehatAuthStatus> {
  const response = await apiFetch('/api/satusehat/auth/status', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Status SATUSEHAT tidak tersedia (HTTP ${response.status})`);
  }

  return response.json() as Promise<SatusehatAuthStatus>;
}

export function useSatusehatConnection(): SatusehatConnectionDisplayStatus {
  const [status, setStatus] = useState<SatusehatConnectionDisplayStatus>('LOADING');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadStatus = async () => {
      try {
        const response = await requestSatusehatStatus(controller.signal);
        if (active) setStatus(response.status);
      } catch {
        if (active && !controller.signal.aborted) setStatus('ERROR');
      }
    };

    void loadStatus();
    const refreshInterval = window.setInterval(() => {
      void loadStatus();
    }, STATUS_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(refreshInterval);
    };
  }, []);

  return status;
}
