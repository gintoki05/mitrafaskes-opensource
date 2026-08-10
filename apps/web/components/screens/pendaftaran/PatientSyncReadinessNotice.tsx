"use client";

import { AlertTriangle } from "lucide-react";
import type { PatientSyncReadiness } from "./patient-sync-readiness";

type PatientSyncReadinessNoticeProps = {
  readiness: PatientSyncReadiness;
  compact?: boolean;
};

export function PatientSyncReadinessNotice({
  readiness,
  compact = false,
}: PatientSyncReadinessNoticeProps) {
  if (readiness.ready) return null;

  return (
    <div
      className={
        compact
          ? "flex items-start gap-1.5 text-[11px] leading-relaxed text-warning"
          : "flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 p-3 text-xs text-warning-foreground"
      }
      role="alert"
    >
      <AlertTriangle
        className={
          compact ? "mt-0.5 h-3.5 w-3.5 shrink-0" : "mt-0.5 h-4 w-4 shrink-0"
        }
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="font-semibold">Belum siap disinkronkan</p>
        {compact ? (
          <p>{readiness.issues[0]}</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {readiness.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        {!compact ? (
          <p className="mt-2 text-[11px] opacity-80">
            Perbaiki data lokal, lalu buka preview ini lagi untuk mencoba ulang.
          </p>
        ) : null}
      </div>
    </div>
  );
}
