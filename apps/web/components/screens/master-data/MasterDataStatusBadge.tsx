import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import type { MasterDataDatasetReadiness } from "@mitrafaskes/shared";
import { Badge } from "@/components/ui/badge";

const statusCopy: Record<MasterDataDatasetReadiness, string> = {
  READY: "Siap lokal",
  EMPTY: "Belum tersedia",
  FAILED: "Refresh gagal",
};

export function MasterDataStatusBadge({
  readiness,
}: {
  readiness: MasterDataDatasetReadiness;
}) {
  const Icon =
    readiness === "READY"
      ? CheckCircle2
      : readiness === "FAILED"
        ? CircleAlert
        : CircleDashed;

  return (
    <Badge
      variant="outline"
      className={
        readiness === "READY"
          ? "border-success/25 bg-success/10 text-success"
          : readiness === "FAILED"
            ? "border-destructive/25 bg-destructive/10 text-destructive"
            : "border-border bg-muted/60 text-muted-foreground"
      }
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {statusCopy[readiness]}
    </Badge>
  );
}
