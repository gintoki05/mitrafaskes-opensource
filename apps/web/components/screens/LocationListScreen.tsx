"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import {
  AccessPermission,
  type LocationSummary,
  type MasterDataListQuery,
} from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { ComboboxField } from "@/components/ui/combobox";
import { useMasterFaskesData } from "@/hooks/useMasterFaskesData";
import { useMasterFaskesList } from "@/hooks/useMasterFaskesList";
import { can } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { MasterFaskesDialog } from "./master-faskes/MasterFaskesDialog";
import { MasterFaskesSubnav } from "./master-faskes/MasterFaskesSubnav";
import { MasterFaskesTable } from "./master-faskes/MasterFaskesTable";
import { SelectField } from "./master-faskes/FormField";
import { LocationForm } from "./master-faskes/LocationForm";
import { getLocationColumns } from "./master-faskes/locationColumns";
import { locationToForm } from "./master-faskes/mappers";
import {
  emptyLocation,
  locationStatuses,
  locationTypes,
} from "./master-faskes/constants";
import type {
  FormMode,
  LocationForm as LocationFormValues,
  SubmittingKind,
} from "./master-faskes/types";

const initialQuery: MasterDataListQuery = {
  page: 1,
  pageSize: 25,
  sort: "name",
  direction: "asc",
};

type ActiveFilter = "all" | "active" | "inactive";
type TypeFilter = "ALL" | LocationSummary["type"];
type LocationStatusFilter = "ALL" | LocationSummary["status"];

export default function LocationListScreen() {
  const session = useSession();
  const canWrite = can(
    session?.user ?? null,
    AccessPermission.MASTER_DATA_WRITE,
  );
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [locationStatusFilter, setLocationStatusFilter] =
    useState<LocationStatusFilter>("ALL");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [serviceUnitFilter, setServiceUnitFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationSummary | null>(null);
  const [submitting, setSubmitting] = useState<SubmittingKind | null>(null);
  const [operationError, setOperationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const list = useMasterFaskesList<LocationSummary>("locations", query);
  const {
    items: listItems,
    meta: listMeta,
    loading: listLoading,
    error: listError,
    refresh: refreshList,
  } = list;
  const {
    organizations,
    serviceUnits,
    locations,
    createLocation,
    updateLocation,
    refresh: refreshOptions,
  } = useMasterFaskesData();
  const initialValues = useMemo(
    () => (editing ? locationToForm(editing) : emptyLocation),
    [editing],
  );
  const mode: FormMode = editing ? "edit" : "create";

  const setFilters = (changes: Partial<MasterDataListQuery>) => {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ search: searchDraft.trim() || undefined });
  };

  const handleActiveFilter = (value: string) => {
    const next = value as ActiveFilter;
    setActiveFilter(next);
    setFilters({ active: next === "all" ? undefined : next === "active" });
  };

  const handleTypeFilter = (value: string) => {
    const next = value as TypeFilter;
    setTypeFilter(next);
    setFilters({ type: next === "ALL" ? undefined : next });
  };

  const handleLocationStatusFilter = (value: string) => {
    const next = value as LocationStatusFilter;
    setLocationStatusFilter(next);
    setFilters({ status: next === "ALL" ? undefined : next });
  };

  const handleOrganizationFilter = (value: string) => {
    setOrganizationFilter(value);
    setServiceUnitFilter("ALL");
    setFilters({
      organizationId: value === "ALL" ? undefined : value,
      serviceUnitId: undefined,
    });
  };

  const handleServiceUnitFilter = (value: string) => {
    setServiceUnitFilter(value);
    setFilters({ serviceUnitId: value === "ALL" ? undefined : value });
  };

  const clearFilters = () => {
    setSearchDraft("");
    setActiveFilter("all");
    setTypeFilter("ALL");
    setLocationStatusFilter("ALL");
    setOrganizationFilter("ALL");
    setServiceUnitFilter("ALL");
    setQuery(initialQuery);
  };

  const openCreate = () => {
    setOperationError("");
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = useCallback((location: LocationSummary) => {
    setOperationError("");
    setEditing(location);
    setDialogOpen(true);
  }, []);

  const closeForm = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (
    input: LocationFormValues,
  ): Promise<boolean> => {
    setSubmitting("location");
    setOperationError("");
    setSuccessMessage("");

    try {
      const payload = {
        ...input,
        serviceUnitId: input.serviceUnitId || undefined,
        parentId: input.parentId || undefined,
      };
      if (editing) {
        await updateLocation(editing.id, payload);
        setSuccessMessage("Location/ruangan berhasil diperbarui.");
      } else {
        await createLocation(payload);
        setSuccessMessage("Location/ruangan berhasil disimpan.");
      }
      closeForm();
      await refreshList();
      await refreshOptions();
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

  const toggleStatus = useCallback(
    async (location: LocationSummary) => {
      setOperationError("");
      setSuccessMessage("");
      try {
        await updateLocation(location.id, {
          ...locationToForm(location),
          active: !location.active,
          serviceUnitId: location.serviceUnitId || undefined,
          parentId: location.parentId || undefined,
        });
        setSuccessMessage(
          location.active
            ? "Location/ruangan dinonaktifkan."
            : "Location/ruangan diaktifkan.",
        );
        await refreshList();
        await refreshOptions();
      } catch (toggleError) {
        setOperationError(
          toggleError instanceof Error
            ? toggleError.message
            : "Status location tidak dapat diperbarui.",
        );
      }
    },
    [refreshList, refreshOptions, updateLocation],
  );

  const columns = useMemo(
    () =>
      getLocationColumns({
        canWrite,
        organizations,
        serviceUnits,
        onEdit: openEdit,
        onToggleStatus: (location) => void toggleStatus(location),
      }),
    [canWrite, openEdit, organizations, serviceUnits, toggleStatus],
  );

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<MapPin className="h-6 w-6" />}
          title="Location / Ruangan"
          description="Kelola struktur lokasi fisik, ruangan, gedung, dan relasinya dengan unit layanan."
          action={
            canWrite ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah location
              </Button>
            ) : undefined
          }
        />
        <MasterFaskesSubnav />
        {successMessage ? (
          <ScreenState
            kind="success"
            title="Tindakan berhasil"
            description={successMessage}
            compact
          />
        ) : null}
        {operationError ? (
          <ScreenState
            kind="error"
            title="Perubahan belum tersimpan"
            description={operationError}
            compact
          />
        ) : null}
        <MasterFaskesTable
          caption="Daftar location dan ruangan"
          emptyTitle="Belum ada location"
          emptyDescription="Tambahkan location setelah organisasi induk tersedia."
          data={listItems}
          columns={columns}
          meta={listMeta}
          loading={listLoading}
          error={listError}
          search={searchDraft}
          searchLabel="Cari kode, nama, atau kota location"
          onSearchChange={setSearchDraft}
          onSearchSubmit={handleSearchSubmit}
          filters={
            <>
              <SelectField
                id="location-filter-active"
                aria-label="Filter status data location"
                value={activeFilter}
                onChange={handleActiveFilter}
                className="w-auto min-w-32 text-xs"
              >
                <option value="all">Semua data</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </SelectField>
              <SelectField
                id="location-filter-type"
                aria-label="Filter jenis location"
                value={typeFilter}
                onChange={handleTypeFilter}
                className="w-auto min-w-36 text-xs"
              >
                <option value="ALL">Semua jenis</option>
                {locationTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="location-filter-status"
                aria-label="Filter status location"
                value={locationStatusFilter}
                onChange={handleLocationStatusFilter}
                className="w-auto min-w-44 text-xs"
              >
                <option value="ALL">Semua status location</option>
                {locationStatuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <ComboboxField
                id="location-filter-organization"
                aria-label="Filter organisasi induk location"
                value={organizationFilter}
                onChange={handleOrganizationFilter}
                placeholder="Semua organisasi"
                clearable={false}
                className="w-56 max-w-full"
                inputClassName="text-xs"
                options={[
                  { value: "ALL", label: "Semua organisasi" },
                  ...organizations.map((organization) => ({
                    value: organization.id,
                    label: `${organization.code} - ${organization.name}`,
                  })),
                ]}
              />
              <ComboboxField
                id="location-filter-service-unit"
                aria-label="Filter unit layanan location"
                value={serviceUnitFilter}
                onChange={handleServiceUnitFilter}
                placeholder="Semua unit layanan"
                clearable={false}
                className="w-56 max-w-full"
                inputClassName="text-xs"
                options={[
                  { value: "ALL", label: "Semua unit layanan" },
                  ...serviceUnits
                  .filter(
                    (unit) =>
                      organizationFilter === "ALL" ||
                      unit.organizationId === organizationFilter,
                  )
                  .map((unit) => ({
                    value: unit.id,
                    label: `${unit.code} - ${unit.name}`,
                  })),
                ]}
              />
            </>
          }
          hasActiveFilters={Boolean(
            query.search ||
              query.active !== undefined ||
              query.type ||
              query.status ||
              query.organizationId ||
              query.serviceUnitId,
          )}
          onClearFilters={clearFilters}
          onRefresh={() => void refreshList()}
          sort={query.sort}
          direction={query.direction}
          onSortChange={(sort, direction) => setFilters({ sort, direction })}
          onPageChange={(page) =>
            setQuery((current) => ({ ...current, page }))
          }
        />
      </div>
      <MasterFaskesDialog
        open={dialogOpen}
        label={`${mode === "edit" ? "Edit" : "Tambah"} location`}
        onClose={closeForm}
        className="max-w-3xl"
      >
        <LocationForm
          key={editing?.id ?? "new"}
          canWrite={canWrite}
          organizations={organizations}
          serviceUnits={serviceUnits}
          locations={locations}
          submitting={submitting}
          onSubmit={handleSubmit}
          initialValues={initialValues}
          mode={mode}
          excludeId={editing?.id}
          onCancel={closeForm}
        />
      </MasterFaskesDialog>
    </RouteGuard>
  );
}
