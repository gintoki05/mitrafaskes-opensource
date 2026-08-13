import type { Encounter } from '@/lib/clinical-types';

export function reconcileRmeSelection(
  current: Encounter | null,
  refreshed: Encounter[],
  retainMissingSelection: boolean,
): Encounter | null {
  if (!current) return refreshed[0] ?? null;

  const refreshedSelection = refreshed.find(
    (encounter) => encounter.id === current.id,
  );
  if (refreshedSelection) return refreshedSelection;
  if (retainMissingSelection) return current;
  return refreshed[0] ?? null;
}
