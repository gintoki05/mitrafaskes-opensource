"use client";

import { useState } from "react";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { AccessPermission } from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useMasterFaskesData } from "@/hooks/useMasterFaskesData";
import { can } from "@/lib/auth";
import { LocationForm } from "./master-faskes/LocationForm";
import { MasterFaskesStructure } from "./master-faskes/MasterFaskesStructure";
import { MasterFaskesSummary } from "./master-faskes/MasterFaskesSummary";
import { OrganizationForm } from "./master-faskes/OrganizationForm";
import { ServiceUnitForm } from "./master-faskes/ServiceUnitForm";
import type {
  LocationForm as LocationFormValues,
  OrganizationForm as OrganizationFormValues,
  ServiceUnitForm as ServiceUnitFormValues,
  SubmittingKind,
} from "./master-faskes/types";

export default function MasterFaskesScreen() {
  const session = useSession();
  const canWrite = can(
    session?.user ?? null,
    AccessPermission.MASTER_DATA_WRITE,
  );
  const {
    organizations,
    serviceUnits,
    locations,
    loading,
    error,
    refresh,
    createOrganization,
    createServiceUnit,
    createLocation,
  } = useMasterFaskesData();
  const [submitting, setSubmitting] = useState<SubmittingKind | null>(null);
  const [operationError, setOperationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const resetFeedback = () => {
    setOperationError("");
    setSuccessMessage("");
  };

  const handleOrganizationSubmit = async (
    input: OrganizationFormValues,
  ): Promise<boolean> => {
    resetFeedback();
    setSubmitting("organization");
    try {
      await createOrganization({
        ...input,
        parentId: input.parentId || undefined,
      });
      setSuccessMessage("Organisasi/faskes berhasil disimpan.");
      return true;
    } catch (submitError) {
      setOperationError(
        submitError instanceof Error
          ? submitError.message
          : "Organisasi tidak dapat disimpan.",
      );
      return false;
    } finally {
      setSubmitting(null);
    }
  };

  const handleServiceUnitSubmit = async (
    input: ServiceUnitFormValues,
  ): Promise<boolean> => {
    resetFeedback();
    setSubmitting("unit");
    try {
      await createServiceUnit({
        ...input,
        parentId: input.parentId || undefined,
      });
      setSuccessMessage("Unit layanan/poli berhasil disimpan.");
      return true;
    } catch (submitError) {
      setOperationError(
        submitError instanceof Error
          ? submitError.message
          : "Unit layanan tidak dapat disimpan.",
      );
      return false;
    } finally {
      setSubmitting(null);
    }
  };

  const handleLocationSubmit = async (
    input: LocationFormValues,
  ): Promise<boolean> => {
    resetFeedback();
    setSubmitting("location");
    try {
      await createLocation({
        ...input,
        serviceUnitId: input.serviceUnitId || undefined,
        parentId: input.parentId || undefined,
      });
      setSuccessMessage("Location/ruangan berhasil disimpan.");
      return true;
    } catch (submitError) {
      setOperationError(
        submitError instanceof Error
          ? submitError.message
          : "Location tidak dapat disimpan.",
      );
      return false;
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Building2 className="h-6 w-6" />}
          title="Master Fasilitas Kesehatan"
          description="Bangun struktur lokal yang stabil sebelum dipetakan ke resource SATUSEHAT: organisasi/faskes, unit layanan, dan lokasi fisik."
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
                className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
              />
              Muat ulang
            </Button>
          }
        />

        {successMessage ? (
          <ScreenState
            kind="success"
            title="Tindakan berhasil"
            description={successMessage}
            compact
          />
        ) : null}
        {error || operationError ? (
          <ScreenState
            kind="error"
            title="Master faskes belum tersedia"
            description={[error, operationError].filter(Boolean).join(" ")}
            compact
          />
        ) : null}

        <MasterFaskesSummary
          organizationCount={organizations.length}
          serviceUnitCount={serviceUnits.length}
          locationCount={locations.length}
        />

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          <OrganizationForm
            canWrite={canWrite}
            organizations={organizations}
            submitting={submitting}
            onSubmit={handleOrganizationSubmit}
          />
          <ServiceUnitForm
            canWrite={canWrite}
            organizations={organizations}
            serviceUnits={serviceUnits}
            submitting={submitting}
            onSubmit={handleServiceUnitSubmit}
          />
          <LocationForm
            canWrite={canWrite}
            organizations={organizations}
            serviceUnits={serviceUnits}
            locations={locations}
            submitting={submitting}
            onSubmit={handleLocationSubmit}
          />
        </div>

        <MasterFaskesStructure
          loading={loading}
          organizations={organizations}
          serviceUnits={serviceUnits}
          locations={locations}
        />

        <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-info/20 bg-info/5 p-4 text-xs text-info">
          <Plus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Master lokal tetap tidak menyimpan ID SATUSEHAT langsung pada
            entitas domain. Organization sudah memiliki preview, verifikasi,
            dan linkage per environment; adapter unit layanan dan Location
            menyusul setelah struktur Organization tervalidasi.
          </p>
        </div>
      </div>
    </RouteGuard>
  );
}
