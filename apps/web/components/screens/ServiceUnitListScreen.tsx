"use client";

import { type SubmitEvent, useCallback, useMemo, useState } from "react";
import { Layers3, Plus } from "lucide-react";
import {
  AccessPermission,
  type MasterDataListQuery,
  type ServiceUnitSummary,
} from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { useMasterFaskesData } from "@/hooks/useMasterFaskesData";
import { useMasterFaskesList } from "@/hooks/useMasterFaskesList";
import { can } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { MasterFaskesDialog } from "./master-faskes/MasterFaskesDialog";
import { MasterFaskesSubnav } from "./master-faskes/MasterFaskesSubnav";
import { MasterFaskesTable } from "./master-faskes/MasterFaskesTable";
import { ComboboxField } from "@/components/ui/combobox";
import { SelectField } from "./master-faskes/FormField";
import { ServiceUnitForm } from "./master-faskes/ServiceUnitForm";
import { getServiceUnitColumns } from "./master-faskes/serviceUnitColumns";
import { serviceUnitToForm } from "./master-faskes/mappers";
import { emptyServiceUnit, serviceUnitTypes } from "./master-faskes/constants";
import type {
  FormMode,
  ServiceUnitForm as ServiceUnitFormValues,
  SubmittingKind,
} from "./master-faskes/types";
import { toast } from "sonner";

const initialQuery: MasterDataListQuery = {
  page: 1,
  pageSize: 25,
  sort: "name",
  direction: "asc",
};

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "ALL" | ServiceUnitSummary["type"];

export default function ServiceUnitListScreen() {
  const session = useSession();
  const canWrite = can(
    session?.user ?? null,
    AccessPermission.MASTER_DATA_WRITE,
  );
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceUnitSummary | null>(null);
  const [submitting, setSubmitting] = useState<SubmittingKind | null>(null);

  const list = useMasterFaskesList<ServiceUnitSummary>("service-units", query);
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
    createServiceUnit,
    updateServiceUnit,
    refresh: refreshOptions,
  } = useMasterFaskesData();
  const initialValues = useMemo(
    () => (editing ? serviceUnitToForm(editing) : emptyServiceUnit),
    [editing],
  );
  const mode: FormMode = editing ? "edit" : "create";

  const setFilters = (changes: Partial<MasterDataListQuery>) => {
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  };

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ search: searchDraft.trim() || undefined });
  };

  const handleStatusFilter = (value: string) => {
    const next = value as StatusFilter;
    setStatusFilter(next);
    setFilters({ active: next === "all" ? undefined : next === "active" });
  };

  const handleTypeFilter = (value: string) => {
    const next = value as TypeFilter;
    setTypeFilter(next);
    setFilters({ type: next === "ALL" ? undefined : next });
  };

  const handleOrganizationFilter = (value: string) => {
    setOrganizationFilter(value);
    setFilters({ organizationId: value === "ALL" ? undefined : value });
  };

  const clearFilters = () => {
    setSearchDraft("");
    setStatusFilter("all");
    setTypeFilter("ALL");
    setOrganizationFilter("ALL");
    setQuery(initialQuery);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = useCallback((serviceUnit: ServiceUnitSummary) => {
    setEditing(serviceUnit);
    setDialogOpen(true);
  }, []);

  const closeForm = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (
    input: ServiceUnitFormValues,
  ): Promise<boolean> => {
    setSubmitting("unit");

    try {
      const payload = { ...input, parentId: input.parentId || undefined };
      if (editing) {
        await updateServiceUnit(editing.id, payload);
        toast.success("Unit layanan/poli berhasil diperbarui.");
      } else {
        await createServiceUnit(payload);
        toast.success("Unit layanan/poli berhasil disimpan.");
      }
      closeForm();
      await refreshList();
      await refreshOptions();
      return true;
    } catch (submitError) {
      toast.error("Perubahan belum tersimpan", {
        description:
          submitError instanceof Error
            ? submitError.message
            : "Unit layanan tidak dapat disimpan.",
        duration: 7000,
      });
      return false;
    } finally {
      setSubmitting(null);
    }
  };

  const toggleStatus = useCallback(
    async (serviceUnit: ServiceUnitSummary) => {
      try {
        await updateServiceUnit(serviceUnit.id, {
          ...serviceUnitToForm(serviceUnit),
          active: !serviceUnit.active,
          parentId: serviceUnit.parentId || undefined,
        });
        toast.success(
          serviceUnit.active
            ? "Unit layanan/poli dinonaktifkan."
            : "Unit layanan/poli diaktifkan.",
        );
        await refreshList();
        await refreshOptions();
      } catch (toggleError) {
        toast.error("Status unit layanan belum diperbarui", {
          description:
            toggleError instanceof Error
              ? toggleError.message
              : "Status unit layanan tidak dapat diperbarui.",
          duration: 7000,
        });
      }
    },
    [refreshList, refreshOptions, updateServiceUnit],
  );

  const columns = useMemo(
    () =>
      getServiceUnitColumns({
        canWrite,
        organizations,
        serviceUnits,
        onEdit: openEdit,
        onToggleStatus: (serviceUnit) => void toggleStatus(serviceUnit),
      }),
    [canWrite, openEdit, organizations, serviceUnits, toggleStatus],
  );

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Layers3 className="h-6 w-6" />}
          title="Unit Layanan / Poli"
          description="Kelola unit layanan, poli, departemen, dan unit pendukung di dalam organisasi."
          action={
            canWrite ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah unit layanan
              </Button>
            ) : undefined
          }
        />
        <MasterFaskesSubnav />
        <MasterFaskesTable
          caption="Daftar unit layanan dan poli"
          emptyTitle="Belum ada unit layanan"
          emptyDescription="Tambahkan unit layanan setelah organisasi induk tersedia."
          data={listItems}
          columns={columns}
          meta={listMeta}
          loading={listLoading}
          error={listError}
          search={searchDraft}
          searchLabel="Cari kode atau nama unit layanan"
          onSearchChange={setSearchDraft}
          onSearchSubmit={handleSearchSubmit}
          filters={
            <>
              <SelectField
                id="unit-filter-status"
                aria-label="Filter status unit layanan"
                value={statusFilter}
                onChange={handleStatusFilter}
                className="w-auto min-w-32 text-xs"
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </SelectField>
              <SelectField
                id="unit-filter-type"
                aria-label="Filter jenis unit layanan"
                value={typeFilter}
                onChange={handleTypeFilter}
                className="w-auto min-w-40 text-xs"
              >
                <option value="ALL">Semua jenis</option>
                {serviceUnitTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <ComboboxField
                id="unit-filter-organization"
                aria-label="Filter organisasi induk unit layanan"
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
            </>
          }
          hasActiveFilters={Boolean(
            query.search ||
              query.active !== undefined ||
              query.type ||
              query.organizationId,
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
        label={`${mode === "edit" ? "Edit" : "Tambah"} unit layanan`}
        onClose={closeForm}
        className="max-w-2xl"
      >
        <ServiceUnitForm
          key={editing?.id ?? "new"}
          canWrite={canWrite}
          organizations={organizations}
          serviceUnits={serviceUnits}
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
