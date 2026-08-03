"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import {
  AccessPermission,
  type MasterDataListQuery,
  type OrganizationSummary,
} from "@mitrafaskes/shared";
import { PageHeader } from "@/components/PageHeader";
import { RouteGuard } from "@/components/RouteGuard";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { useMasterFaskesData } from "@/hooks/useMasterFaskesData";
import { useMasterFaskesList } from "@/hooks/useMasterFaskesList";
import { can } from "@/lib/auth";
import { useSession } from "@/hooks/useSession";
import { MasterFaskesDialog } from "./master-faskes/MasterFaskesDialog";
import { MasterFaskesSubnav } from "./master-faskes/MasterFaskesSubnav";
import { MasterFaskesTable } from "./master-faskes/MasterFaskesTable";
import { OrganizationForm } from "./master-faskes/OrganizationForm";
import { OrganizationSyncDialog } from "./master-faskes/OrganizationSyncDialog";
import { SelectField } from "./master-faskes/FormField";
import { getOrganizationColumns } from "./master-faskes/organizationColumns";
import { organizationToForm } from "./master-faskes/mappers";
import { emptyOrganization, organizationTypes } from "./master-faskes/constants";
import type {
  FormMode,
  OrganizationForm as OrganizationFormValues,
  SubmittingKind,
} from "./master-faskes/types";

const initialQuery: MasterDataListQuery = {
  page: 1,
  pageSize: 25,
  sort: "name",
  direction: "asc",
};

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "ALL" | OrganizationSummary["type"];

export default function OrganizationListScreen() {
  const session = useSession();
  const canWrite = can(
    session?.user ?? null,
    AccessPermission.MASTER_DATA_WRITE,
  );
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationSummary | null>(null);
  const [syncOrganization, setSyncOrganization] =
    useState<OrganizationSummary | null>(null);
  const [submitting, setSubmitting] = useState<SubmittingKind | null>(null);
  const [operationError, setOperationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const list = useMasterFaskesList<OrganizationSummary>(
    "organizations",
    query,
  );
  const {
    items: listItems,
    meta: listMeta,
    loading: listLoading,
    error: listError,
    refresh: refreshList,
  } = list;
  const {
    organizations,
    createOrganization,
    updateOrganization,
    refresh: refreshOptions,
  } = useMasterFaskesData();
  const initialValues = useMemo(
    () => (editing ? organizationToForm(editing) : emptyOrganization),
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

  const clearFilters = () => {
    setSearchDraft("");
    setStatusFilter("all");
    setTypeFilter("ALL");
    setQuery(initialQuery);
  };

  const openCreate = () => {
    setOperationError("");
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = useCallback((organization: OrganizationSummary) => {
    setOperationError("");
    setEditing(organization);
    setDialogOpen(true);
  }, []);

  const closeForm = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (
    input: OrganizationFormValues,
  ): Promise<boolean> => {
    setSubmitting("organization");
    setOperationError("");
    setSuccessMessage("");

    try {
      const payload = {
        ...input,
        parentId: input.parentId || undefined,
      };
      if (editing) {
        await updateOrganization(editing.id, payload);
        setSuccessMessage("Organisasi/faskes berhasil diperbarui.");
      } else {
        await createOrganization(payload);
        setSuccessMessage("Organisasi/faskes berhasil disimpan.");
      }
      closeForm();
      await refreshList();
      await refreshOptions();
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

  const toggleStatus = useCallback(
    async (organization: OrganizationSummary) => {
      setOperationError("");
      setSuccessMessage("");
      try {
        await updateOrganization(organization.id, {
          ...organizationToForm(organization),
          active: !organization.active,
          parentId: organization.parentId || undefined,
        });
        setSuccessMessage(
          organization.active
            ? "Organisasi/faskes dinonaktifkan."
            : "Organisasi/faskes diaktifkan.",
        );
        await refreshList();
        await refreshOptions();
      } catch (toggleError) {
        setOperationError(
          toggleError instanceof Error
            ? toggleError.message
            : "Status organisasi tidak dapat diperbarui.",
        );
      }
    },
    [refreshList, refreshOptions, updateOrganization],
  );

  const columns = useMemo(
    () =>
      getOrganizationColumns({
        canWrite,
        organizations,
        onPreview: setSyncOrganization,
        onEdit: openEdit,
        onToggleStatus: (organization) => void toggleStatus(organization),
      }),
    [canWrite, organizations, openEdit, toggleStatus],
  );

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Building2 className="h-6 w-6" />}
          title="Organisasi / Faskes"
          description="Kelola organisasi induk dan sub-organisasi yang menjadi dasar struktur fasilitas kesehatan."
          action={
            canWrite ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah organisasi
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
          caption="Daftar organisasi dan faskes"
          emptyTitle="Belum ada organisasi"
          emptyDescription="Tambahkan organisasi/faskes untuk mulai membangun struktur master."
          data={listItems}
          columns={columns}
          meta={listMeta}
          loading={listLoading}
          error={listError}
          search={searchDraft}
          searchLabel="Cari kode, nama, atau alamat organisasi"
          onSearchChange={setSearchDraft}
          onSearchSubmit={handleSearchSubmit}
          filters={
            <>
              <SelectField
                id="organization-filter-status"
                aria-label="Filter status organisasi"
                value={statusFilter}
                onChange={handleStatusFilter}
                className="w-auto min-w-32 text-xs"
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </SelectField>
              <SelectField
                id="organization-filter-type"
                aria-label="Filter jenis organisasi"
                value={typeFilter}
                onChange={handleTypeFilter}
                className="w-auto min-w-40 text-xs"
              >
                <option value="ALL">Semua jenis</option>
                {organizationTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </>
          }
          hasActiveFilters={Boolean(
            query.search || query.active !== undefined || query.type,
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
        label={`${mode === "edit" ? "Edit" : "Tambah"} organisasi / faskes`}
        onClose={closeForm}
      >
        <OrganizationForm
          key={editing?.id ?? "new"}
          canWrite={canWrite}
          organizations={organizations}
          submitting={submitting}
          onSubmit={handleSubmit}
          initialValues={initialValues}
          mode={mode}
          excludeId={editing?.id}
          onCancel={closeForm}
        />
      </MasterFaskesDialog>
      <OrganizationSyncDialog
        open={syncOrganization !== null}
        organization={syncOrganization}
        canSync={canWrite}
        onClose={() => setSyncOrganization(null)}
        onSynced={() => {
          void refreshOptions();
        }}
      />
    </RouteGuard>
  );
}
