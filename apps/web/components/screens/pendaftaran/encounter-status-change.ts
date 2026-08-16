import { EncounterStatus } from '@mitrafaskes/shared';
import type {
  Encounter,
  SatusehatEncounterSyncResult,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { getIntegrationLinkage } from '@/lib/integrations';

type RefreshEncounters = (
  page?: number,
  statuses?: readonly EncounterStatus[],
) => Promise<void>;

export type EncounterStatusChangeDependencies = {
  updateStatus: (
    id: string,
    status: EncounterStatus,
    expectedVersion: number,
  ) => Promise<Encounter>;
  syncSatusehat: (id: string) => Promise<SatusehatEncounterSyncResult>;
  refreshEncounters: RefreshEncounters;
  page: number;
  queueStatuses: readonly EncounterStatus[];
  satusehatConfigured: boolean;
  canSync: boolean;
};

function syncErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Status SATUSEHAT belum dapat diperbarui.';
}

/**
 * Applies the local lifecycle transition first, then best-effort syncs an
 * already-linked Encounter after cancellation. Remote failure never rolls
 * back the committed local status.
 */
export async function changeEncounterStatus(
  encounter: Encounter,
  status: EncounterStatus,
  dependencies: EncounterStatusChangeDependencies,
): Promise<void> {
  const updated = await dependencies.updateStatus(
    encounter.id,
    status,
    encounter.version,
  );
  toast.success('Status kunjungan diperbarui.', {
    description: `Kunjungan ${updated.encounterNumber} sudah diperbarui.`,
  });
  await dependencies.refreshEncounters(
    dependencies.page,
    dependencies.queueStatuses,
  );

  const linkedToSatusehat = Boolean(
    getIntegrationLinkage(encounter.integrations, 'SATUSEHAT'),
  );
  if (status !== EncounterStatus.CANCELLED || !linkedToSatusehat) return;

  if (!dependencies.satusehatConfigured) {
    toast.warning('Pembatalan lokal berhasil.', {
      description:
        'Status SATUSEHAT belum diperbarui karena koneksi SATUSEHAT belum tersedia.',
      duration: 8000,
    });
    return;
  }

  if (!dependencies.canSync) {
    toast.warning('Pembatalan lokal berhasil.', {
      description:
        'Status SATUSEHAT perlu diperbarui oleh pengguna yang memiliki izin sinkronisasi.',
      duration: 8000,
    });
    return;
  }

  toast.info('Memperbarui status Encounter di SATUSEHAT.', {
    description:
      'Status lokal sudah dibatalkan. Sinkronisasi remote berjalan setelah penyimpanan lokal berhasil.',
  });
  try {
    const syncResult = await dependencies.syncSatusehat(updated.id);
    await dependencies.refreshEncounters(
      dependencies.page,
      dependencies.queueStatuses,
    );
    toast.success('Status SATUSEHAT berhasil diperbarui.', {
      description:
        syncResult.operation === 'UPDATE'
          ? 'Encounter yang sama sekarang berstatus dibatalkan di SATUSEHAT.'
          : 'Encounter lokal belum memiliki linkage; data remote baru dibuat.',
    });
  } catch (syncError) {
    await dependencies.refreshEncounters(
      dependencies.page,
      dependencies.queueStatuses,
    );
    toast.warning('Pembatalan lokal berhasil, tetapi sync SATUSEHAT gagal.', {
      description: syncErrorMessage(syncError),
      duration: 9000,
    });
  }
}
