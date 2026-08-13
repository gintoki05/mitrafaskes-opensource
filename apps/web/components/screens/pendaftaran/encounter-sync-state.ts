import type {
  ResourceIntegrationSummary,
  SatusehatEncounterOperation,
} from '@mitrafaskes/shared';

export type EncounterSyncUiPhase =
  | 'loading'
  | 'error'
  | 'connected'
  | 'ready';

export function resolveEncounterSyncUiState(input: {
  canSync: boolean;
  previewLoading: boolean;
  previewError: string;
  syncing: boolean;
  previewOperation?: SatusehatEncounterOperation;
  integration?: ResourceIntegrationSummary;
}) {
  const connected = Boolean(input.integration?.linkage);
  const latestFailure =
    input.integration?.latestSync?.status === 'FAILED'
      ? input.integration.latestSync.errorMessage ??
        'Percobaan sinkronisasi terakhir gagal.'
      : '';
  const error = input.previewError || latestFailure;
  const loading = input.previewLoading || input.syncing;
  const phase: EncounterSyncUiPhase = loading
    ? 'loading'
    : error
      ? 'error'
      : connected
        ? 'connected'
        : 'ready';
  const disabledReason = !input.canSync
    ? 'Peran Anda tidak memiliki izin sinkronisasi.'
    : input.syncing
      ? 'Sinkronisasi sedang berlangsung.'
      : input.previewLoading
        ? 'Preview payload sedang dimuat.'
        : input.previewError
          ? 'Perbaiki dependency atau data Encounter sebelum sinkronisasi.'
          : undefined;

  return {
    phase,
    connected,
    error,
    repeatSync:
      connected && (input.previewOperation ?? 'UPDATE') === 'UPDATE',
    disabled: Boolean(disabledReason),
    disabledReason,
  };
}

export function shouldRefreshEncounterListAfterSync(
  outcome: 'SUCCESS' | 'FAILED',
): boolean {
  return outcome === 'SUCCESS' || outcome === 'FAILED';
}
