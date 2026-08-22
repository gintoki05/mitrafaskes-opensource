"use client";

import { useCallback } from "react";
import { HeartPulse, RefreshCw } from "lucide-react";
import { AccessPermission, type TriageStatus } from "@mitrafaskes/shared";
import { RouteGuard } from "@/components/RouteGuard";
import { PageHeader } from "@/components/PageHeader";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControl } from "@/components/ui/pagination";
import { RmeWorkspaceContext } from "./rme/RmeWorkspaceContext";
import { TriageForm } from "./triase/TriageForm";
import {
  TriageApiError,
  useTriageLifecycle,
} from "./triase/useTriageLifecycle";
import { useTriageResources } from "./triase/useTriageResources";
import { useSession } from "@/hooks/useSession";
import { can } from "@/lib/auth";
import { formatEncounterQueueDate } from "@/lib/encounter-display";
import { toast } from "sonner";
import {
  getSatusehatEncounterStatus,
  getSatusehatEncounterStatusTooltip,
} from "@/components/satusehat/satusehat-status";

const triageLabels: Record<TriageStatus, string> = {
  NOT_STARTED: "Belum triase",
  DRAFT: "Draft triase",
  COMPLETED: "Triase selesai",
};

export default function TriaseScreen() {
  const session = useSession();
  const resources = useTriageResources();
  const lifecycle = useTriageLifecycle(resources.selected?.id ?? null);
  const errorDescription = useCallback(
    (error: unknown) =>
      error instanceof TriageApiError && error.issues.length
        ? error.issues.map((issue) => issue.message).join(" ")
        : error instanceof Error
          ? error.message
          : "Triase tidak dapat diproses.",
    [],
  );
  const save = async (
    values: Parameters<React.ComponentProps<typeof TriageForm>["onSave"]>[0],
  ) => {
    try {
      await lifecycle.saveDraft(values);
      await resources.refresh(resources.meta.page);
      toast.success("Draft triase tersimpan");
    } catch (error) {
      toast.error("Draft triase gagal disimpan", {
        description: errorDescription(error),
        duration: 8000,
      });
    }
  };
  const complete = async () => {
    try {
      await lifecycle.complete();
      await resources.refresh(resources.meta.page);
      toast.success("Triase selesai", {
        description:
          "Pasien tetap berada di antrean dan siap dipanggil dokter.",
      });
    } catch (error) {
      toast.error("Triase belum dapat diselesaikan", {
        description: errorDescription(error),
        duration: 8000,
      });
    }
  };
  return (
    <RouteGuard permission={AccessPermission.RME_TRIAGE_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<HeartPulse className="h-6 w-6" />}
          title="Triase Perawat"
          description="Antrean triase dan hasil triase yang sudah tersimpan untuk kunjungan aktif tersedia di sini."
        />
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Antrean & hasil triase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resources.loading ? (
                <ScreenState kind="loading" title="Memuat antrean" compact />
              ) : resources.error ? (
                <ScreenState
                  kind="error"
                  title="Antrean tidak tersedia"
                  description={resources.error}
                  compact
                  action={
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void resources.refresh(resources.meta.page)
                      }
                    >
                      <RefreshCw className="h-4 w-4" />
                      Coba lagi
                    </Button>
                  }
                />
              ) : resources.encounters.length === 0 ? (
                <ScreenState
                  kind="empty"
                  title="Belum ada antrean atau hasil triase"
                  description="Pasien yang menunggu triase dan hasil triase yang sudah selesai akan tampil di sini."
                />
              ) : (
                resources.encounters.map((encounter) => (
                  <button
                    key={encounter.id}
                    type="button"
                    onClick={() => resources.select(encounter)}
                    className={`flex w-full items-center justify-between rounded-[var(--radius-card)] border p-3 text-left ${resources.selected?.id === encounter.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted"}`}
                    aria-pressed={resources.selected?.id === encounter.id}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {encounter.patient?.fullName}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        #{encounter.queueNumber} ·{" "}
                        {encounter.patient?.medicalRecNo} · {formatEncounterQueueDate(encounter.queueDate)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        title={getSatusehatEncounterStatusTooltip(encounter.status)}
                      >
                        {getSatusehatEncounterStatus(encounter.status)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {triageLabels[encounter.triage?.status ?? "NOT_STARTED"]}
                      </Badge>
                    </span>
                  </button>
                ))
              )}
              {Math.ceil(resources.meta.total / resources.meta.pageSize) > 1 ? (
                <PaginationControl
                  page={resources.meta.page}
                  totalPages={Math.ceil(
                    resources.meta.total / resources.meta.pageSize,
                  )}
                  onPageChange={(page) => void resources.refresh(page)}
                  disabled={resources.loading}
                  showLabels={false}
                  aria-label="Navigasi halaman antrean triase"
                />
              ) : null}
            </CardContent>
          </Card>
          <div className="min-w-0 space-y-6 lg:col-span-3">
            {resources.selected ? (
              <RmeWorkspaceContext
                encounter={resources.selected}
                record={lifecycle.record}
              />
            ) : null}
            {lifecycle.loading ? (
              <ScreenState
                kind="loading"
                title="Memuat triase"
                description="Mengambil draft klinis terbaru."
              />
            ) : lifecycle.loadError ? (
              <ScreenState
                kind="error"
                title="Triase tidak tersedia"
                description={lifecycle.loadError}
                action={
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void lifecycle.reload()}
                  >
                    Muat ulang
                  </Button>
                }
              />
            ) : resources.selected ? (
              <TriageForm
                key={`${resources.selected.id}:${lifecycle.record?.version ?? "new"}`}
                record={lifecycle.record}
                mutationState={lifecycle.mutationState}
                issues={lifecycle.issues}
                canSave={can(
                  session?.user ?? null,
                  AccessPermission.RME_TRIAGE_WRITE,
                )}
                canComplete={can(
                  session?.user ?? null,
                  AccessPermission.RME_TRIAGE_COMPLETE,
                )}
                onSave={save}
                onComplete={complete}
                onReload={() => void lifecycle.reload()}
              />
            ) : (
              <ScreenState
                kind="empty"
                title="Belum ada pasien dipilih"
                description="Pilih pasien untuk mulai mengisi triase."
              />
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
