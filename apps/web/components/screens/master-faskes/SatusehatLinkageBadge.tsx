import Image from "next/image";
import type { SatusehatLinkageSummary } from "@mitrafaskes/shared";

type SatusehatLinkageBadgeProps = {
  linkage?: SatusehatLinkageSummary;
  resourceName: string;
};

export function SatusehatLinkageBadge({
  linkage,
  resourceName,
}: SatusehatLinkageBadgeProps) {
  if (!linkage) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Belum tersinkron
      </span>
    );
  }

  const lastSyncedLabel = linkage.lastSyncedAt
    ? ` Terakhir: ${new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(linkage.lastSyncedAt))}.`
    : "";

  return (
    <span
      className="inline-flex whitespace-nowrap items-center gap-1.5 text-xs font-semibold text-success"
      title={`Terhubung ke SATUSEHAT. ${resourceName} memiliki ID ${linkage.externalResourceId}.${lastSyncedLabel}`}
    >
      <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded border border-success/25 bg-white">
        <Image
          src="/satusehat.png"
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </span>
      <span>Terhubung</span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {linkage.externalResourceId}
      </span>
      <span className="sr-only">
        {resourceName} sudah tersinkron ke SATUSEHAT dengan ID {linkage.externalResourceId}
      </span>
    </span>
  );
}
