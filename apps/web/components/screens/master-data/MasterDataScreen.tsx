"use client";

import { Database, RefreshCw } from "lucide-react";
import { AccessPermission } from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { MasterDataDatasetCard } from "./MasterDataDatasetCard";
import { MasterDataRefreshProgress } from "./MasterDataRefreshProgress";
import { MasterDataSubnav } from "./MasterDataSubnav";
import { useMasterDataDatasets } from "./useMasterDataDatasets";

export default function MasterDataScreen() {
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
  const canRefresh = Boolean(
    session && can(session.user, AccessPermission.MASTER_DATA_WRITE),
  );

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Database className="h-6 w-6" />}
          title="Master Data"
          description="Referensi lokal untuk operasional klinik. SATUSEHAT menjadi panduan dan sumber refresh manual, bukan dependency saat aplikasi digunakan."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refresh()}
              disabled={loading}
              aria-busy={loading}
            >
              <RefreshCw
                className={loading ? "motion-safe:animate-spin" : undefined}
                aria-hidden="true"
              />
              Muat status
            </Button>
          }
        />

        <MasterDataSubnav />

        <MasterDataRefreshProgress active={refreshing} />

        {error ? (
          <ScreenState
            kind="error"
            title="Status Master Data belum tersedia"
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
            title="Refresh Master Wilayah gagal"
            description={actionError}
            compact
          />
        ) : null}

        {loading && datasets.length === 0 ? (
          <ScreenState
            kind="loading"
            title="Memuat status dataset"
            description="Status dibaca dari database lokal. Tidak ada request provider otomatis."
          />
        ) : datasets.length === 0 ? (
          <ScreenState
            kind="empty"
            title="Belum ada metadata dataset"
            description="Jalankan migration dan seed database untuk membuat snapshot lokal."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {datasets.map((dataset) => (
              <MasterDataDatasetCard
                key={dataset.domain}
                dataset={dataset}
                canRefresh={canRefresh}
                refreshing={refreshing}
                onRefresh={
                  dataset.domain === "WILAYAH"
                    ? () => void refreshWilayah().catch(() => undefined)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        <div className="rounded-[var(--radius-card)] border border-info/20 bg-info/5 p-4 text-sm leading-relaxed text-info">
          <strong className="font-semibold">Kebijakan local-first.</strong> Data
          aktif terakhir tetap dipakai ketika provider down, timeout, atau
          mengirim hierarchy tidak valid. Import yang gagal dicatat sebagai
          attempt, tetapi tidak mengubah record aktif.
        </div>
      </div>
    </RouteGuard>
  );
}
