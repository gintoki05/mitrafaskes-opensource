"use client";

import { Building2, RefreshCw } from "lucide-react";
import { AccessPermission } from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { useMasterFaskesData } from "@/hooks/useMasterFaskesData";
import { MasterFaskesStructure } from "./master-faskes/MasterFaskesStructure";
import { MasterFaskesSubnav } from "./master-faskes/MasterFaskesSubnav";
import { MasterFaskesSummary } from "./master-faskes/MasterFaskesSummary";

export default function MasterFaskesScreen() {
  const {
    organizations,
    serviceUnits,
    locations,
    loading,
    error,
    refresh,
  } = useMasterFaskesData();

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Building2 className="h-6 w-6" />}
          title="Master Fasilitas Kesehatan"
          description="Ikhtisar struktur lokal sebelum dipetakan ke resource SATUSEHAT: organisasi/faskes, unit layanan, dan lokasi fisik."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refresh()}
              disabled={loading}
              aria-busy={loading}
              className="border-primary/20 text-xs font-semibold text-primary"
            >
              <RefreshCw
                className={loading ? "h-4 w-4 motion-safe:animate-spin" : "h-4 w-4"}
              />
              Muat ulang
            </Button>
          }
        />

        <MasterFaskesSubnav />

        {error ? (
          <ScreenState
            kind="error"
            title="Master faskes belum tersedia"
            description={error}
            compact
          />
        ) : null}

        <MasterFaskesSummary
          organizationCount={organizations.length}
          serviceUnitCount={serviceUnits.length}
          locationCount={locations.length}
        />

        <MasterFaskesStructure
          loading={loading}
          organizations={organizations}
          serviceUnits={serviceUnits}
          locations={locations}
        />

        <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-info/20 bg-info/5 p-4 text-xs text-info">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Organization induk perlu divalidasi terlebih dahulu sebelum
            sub-organisasi, unit layanan, dan Location disinkronkan ke
            SATUSEHAT. Kelola setiap daftar melalui submenu di atas.
          </p>
        </div>
      </div>
    </RouteGuard>
  );
}
