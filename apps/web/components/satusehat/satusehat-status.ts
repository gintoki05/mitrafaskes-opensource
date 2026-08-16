const remoteStatusLabels: Readonly<Record<string, string>> = {
  arrived: "Menunggu",
  "in-progress": "Sedang diperiksa",
  finished: "Selesai",
  cancelled: "Dibatalkan",
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Ditangguhkan",
  draft: "Draft",
  final: "Final",
};

export function formatSatusehatRemoteStatus(
  status?: string,
): string | undefined {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return undefined;
  return remoteStatusLabels[normalized] ?? status;
}
