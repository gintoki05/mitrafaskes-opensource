"use client";

import { MapPinned, RefreshCw } from "lucide-react";
import { AccessPermission } from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { MasterDataSubnav } from "./MasterDataSubnav";
import { MasterDataRefreshProgress } from "./MasterDataRefreshProgress";
import { MasterDataStatusBadge } from "./MasterDataStatusBadge";
import { MasterWilayahExplorer } from "./MasterWilayahExplorer";
import { useMasterDataDatasets } from "./useMasterDataDatasets";

export default function MasterWilayahScreen() {
  const session = useSession();
  const {
    datasets,
    loading,
    refreshing,
    error,
    actionError,
    refresh,
    refreshWilayah,
  } = useMasterDataDatasets();
  const wilayah = datasets.find((dataset) => dataset.domain === "WILAYAH");
  const canRefresh = Boolean(
    session && can(session.user, AccessPermission.MASTER_DATA_WRITE),
  );

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<MapPinned className="h-6 w-6" />}
          title="Master Wilayah"
          description="Browser referensi Provinsi, Kabupaten/Kota, Kecamatan, dan Desa/Kelurahan dari snapshot lokal. Refresh provider hanya dijalankan manual oleh Admin."
          action={
            canRefresh ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refreshWilayah().catch(() => undefined)}
                disabled={refreshing}
                aria-busy={refreshing}
              >
                <RefreshCw
                  className={
                    refreshing ? "motion-safe:animate-spin" : undefined
                  }
                  aria-hidden="true"
                />
                Sinkronkan snapshot
              </Button>
            ) : undefined
          }
        />

        <MasterDataSubnav />

        <MasterDataRefreshProgress active={refreshing} />

        {error ? (
          <ScreenState
            kind="error"
            title="Status Master Wilayah belum tersedia"
            description={error}
            compact
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
              >
                Coba lagi
              </Button>
            }
          />
        ) : null}

        {actionError ? (
          <ScreenState
            kind="error"
            title="Refresh provider gagal"
            description={actionError}
            compact
          />
        ) : null}

        {wilayah ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
            <div className="flex min-w-0 items-center gap-3">
              <MasterDataStatusBadge readiness={wilayah.readiness} />
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-foreground">
                  {wilayah.activeRecordCount.toLocaleString("id-ID")} record
                  aktif lokal
                </p>
                <p className="truncate text-muted-foreground">
                  Refresh sukses terakhir:{" "}
                  {wilayah.lastSuccessfulAt
                    ? new Date(wilayah.lastSuccessfulAt).toLocaleString("id-ID")
                    : "belum ada"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {wilayah.sourceVersion
                ? `Versi ${wilayah.sourceVersion}`
                : "Snapshot belum di-seed"}
            </p>
          </div>
        ) : loading ? (
          <ScreenState
            kind="loading"
            title="Memuat status Master Wilayah"
            compact
          />
        ) : null}

        <MasterWilayahExplorer />
      </div>
    </RouteGuard>
  );
}
