'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  IntegrationCapability,
  IntegrationCapabilitiesResponse,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';
import { useSession } from './useSession';

type CapabilityLoadState = 'idle' | 'loading' | 'ready' | 'error';

type IntegrationCapabilitiesContextValue = {
  state: CapabilityLoadState;
  capabilities: IntegrationCapability[];
  error: string;
  refresh: () => Promise<void>;
};

const IntegrationCapabilitiesContext = createContext<IntegrationCapabilitiesContextValue>({
  state: 'error',
  capabilities: [],
  error: 'Capability integrasi belum tersedia',
  refresh: async () => undefined,
});

async function requestCapabilities(): Promise<IntegrationCapability[]> {
  const response = await apiFetch('/api/integrations/capabilities', {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Capability integrasi tidak tersedia (HTTP ${response.status})`);
  }
  const payload = (await response.json()) as IntegrationCapabilitiesResponse;
  return Array.isArray(payload.integrations) ? payload.integrations : [];
}

export function IntegrationCapabilitiesProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [state, setState] = useState<CapabilityLoadState>('idle');
  const [capabilities, setCapabilities] = useState<IntegrationCapability[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!session) {
      setState('idle');
      setCapabilities([]);
      setError('');
      return;
    }

    setState('loading');
    setError('');
    try {
      setCapabilities(await requestCapabilities());
      setState('ready');
    } catch (requestError) {
      setCapabilities([]);
      setState('error');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Capability integrasi tidak tersedia',
      );
    }
  }, [session]);

  useEffect(() => {
    let active = true;

    async function loadInitialCapabilities() {
      if (!session) {
        setState('idle');
        setCapabilities([]);
        setError('');
        return;
      }

      setState('loading');
      setError('');
      try {
        const nextCapabilities = await requestCapabilities();
        if (!active) return;
        setCapabilities(nextCapabilities);
        setState('ready');
      } catch (requestError) {
        if (!active) return;
        setCapabilities([]);
        setState('error');
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Capability integrasi tidak tersedia',
        );
      }
    }

    void loadInitialCapabilities();
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo(
    () => ({ state, capabilities, error, refresh }),
    [capabilities, error, refresh, state],
  );

  return (
    <IntegrationCapabilitiesContext.Provider value={value}>
      {children}
    </IntegrationCapabilitiesContext.Provider>
  );
}

export function useIntegrationCapabilities(): IntegrationCapabilitiesContextValue {
  return useContext(IntegrationCapabilitiesContext);
}

export function useIntegrationCapability(
  provider: string,
): {
  capability?: IntegrationCapability;
  loading: boolean;
  error: boolean;
  enabled: boolean;
  available: boolean;
  configured: boolean;
} {
  const { state, capabilities } = useIntegrationCapabilities();
  const capability = capabilities.find(
    (item) => item.provider.toUpperCase() === provider.toUpperCase(),
  );
  const loading = state === 'idle' || state === 'loading';
  const error = state === 'error';
  const enabled = state === 'ready' && capability?.enabled === true;
  return {
    capability,
    loading,
    error,
    enabled,
    available: enabled,
    configured: enabled && capability?.status === 'CONNECTED',
  };
}
