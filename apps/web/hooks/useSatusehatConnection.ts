'use client';

import type { IntegrationProviderStatus } from '@mitrafaskes/shared';
import { useIntegrationCapability } from './useIntegrationCapabilities';

export type SatusehatConnectionDisplayStatus =
  | 'LOADING'
  | IntegrationProviderStatus;

export function useSatusehatConnection(): SatusehatConnectionDisplayStatus {
  const { capability, loading, error } = useIntegrationCapability('SATUSEHAT');
  if (loading) return 'LOADING';
  if (error || !capability) return 'ERROR';
  return capability.status;
}
