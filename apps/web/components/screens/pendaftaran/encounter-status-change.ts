import { EncounterStatus } from '@mitrafaskes/shared';
import type { Encounter } from '@mitrafaskes/shared';
import { toast } from 'sonner';

type RefreshEncounters = (
  page?: number,
  statuses?: readonly EncounterStatus[],
) => Promise<void>;

export type EncounterStatusChangeDependencies = {
  updateStatus: (
    id: string,
    status: EncounterStatus,
    expectedVersion: number,
    reason?: string,
  ) => Promise<Encounter>;
  refreshEncounters: RefreshEncounters;
  page: number;
  queueStatuses: readonly EncounterStatus[];
};

/**
 * Persists the local lifecycle transition and refreshes the queue. Remote
 * delivery is handled asynchronously by the backend integration outbox.
 */
export async function changeEncounterStatus(
  encounter: Encounter,
  status: EncounterStatus,
  dependencies: EncounterStatusChangeDependencies,
  reason?: string,
): Promise<void> {
  const updated = await dependencies.updateStatus(
    encounter.id,
    status,
    encounter.version,
    reason,
  );
  toast.success('Status kunjungan diperbarui.', {
    description: `Kunjungan ${updated.encounterNumber} sudah diperbarui.`,
  });
  await dependencies.refreshEncounters(
    dependencies.page,
    dependencies.queueStatuses,
  );
}
