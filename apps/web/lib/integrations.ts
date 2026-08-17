import type { ResourceIntegrationSummary } from '@mitrafaskes/shared';

export function getIntegrationSummary(
  integrations: readonly ResourceIntegrationSummary[] | undefined,
  provider: string,
): ResourceIntegrationSummary | undefined {
  return integrations?.find(
    (integration) => integration.provider.toUpperCase() === provider.toUpperCase(),
  );
}

export function getIntegrationLinkage(
  integrations: readonly ResourceIntegrationSummary[] | undefined,
  provider: string,
) {
  return getIntegrationSummary(integrations, provider)?.linkage;
}

export function getLatestIntegrationSync(
  integrations: readonly ResourceIntegrationSummary[] | undefined,
  provider: string,
) {
  return getIntegrationSummary(integrations, provider)?.latestSync;
}
