import { Progress } from '@/components/ui/progress';

export function MasterDataRefreshProgress({
  active,
}: {
  active: boolean;
}) {
  if (!active) return null;

  return (
    <div
      className="space-y-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Memperbarui Master Wilayah
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Mengambil snapshot terbaru dari provider. Snapshot lokal terakhir
            tetap digunakan sampai import berhasil.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          Berjalan
        </span>
      </div>
      <Progress
        value={null}
        aria-label="Refresh Master Wilayah sedang berjalan"
      />
    </div>
  );
}
