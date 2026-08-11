"use client";

import { type SubmitEvent, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Building2, Plus } from "lucide-react";
import {
  AccessPermission,
  type MasterDataListQuery,
  type OrganizationSummary,
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
import { MasterFaskesStatusFilter } from "./master-faskes/MasterFaskesStatusFilter";
import { OrganizationForm } from "./master-faskes/OrganizationForm";
import { OrganizationSyncDialog } from "./master-faskes/OrganizationSyncDialog";
import { OrganizationImportDialog } from "./master-faskes/OrganizationImportDialog";
import { OrganizationLinkDialog } from "./master-faskes/OrganizationLinkDialog";
import { OrganizationStatusAlert } from "./master-faskes/OrganizationStatusAlert";
import { SelectField } from "./master-faskes/FormField";
import { getOrganizationColumns } from "./master-faskes/organizationColumns";
import { organizationToForm } from "./master-faskes/mappers";
import { emptyOrganization, organizationTypes } from "./master-faskes/constants";
import { toast } from "sonner";
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

type TypeFilter = "ALL" | OrganizationSummary["type"];

export default function OrganizationListScreen() {
  const session = useSession();
  const canWrite = can(
    session?.user ?? null,
    AccessPermission.MASTER_DATA_WRITE,
  );
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationSummary | null>(null);
  const [syncOrganization, setSyncOrganization] =
    useState<OrganizationSummary | null>(null);
  const [linkOrganization, setLinkOrganization] =
    useState<OrganizationSummary | null>(null);
  const [statusOrganization, setStatusOrganization] =
    useState<OrganizationSummary | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState<SubmittingKind | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

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
    statusCounts,
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

  const handleSearchSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters({ search: searchDraft.trim() || undefined });
  };

  const handleStatusFilter = (active: boolean | undefined) => {
    setStatusFilter(active);
    setFilters({ active });
  };

  const handleTypeFilter = (value: string) => {
    const next = value as TypeFilter;
    setTypeFilter(next);
    setFilters({ type: next === "ALL" ? undefined : next });
  };

  const clearFilters = () => {
    setSearchDraft("");
    setStatusFilter(undefined);
    setTypeFilter("ALL");
    setQuery(initialQuery);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openImport = () => {
    setImportDialogOpen(true);
  };

  const openLink = useCallback((organization: OrganizationSummary) => {
    setLinkOrganization(organization);
  }, []);

  const openEdit = useCallback((organization: OrganizationSummary) => {
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

    try {
      const payload = {
        ...input,
        parentId: input.parentId || undefined,
      };
      if (editing) {
        await updateOrganization(editing.id, payload);
        toast.success("Organisasi/faskes berhasil diperbarui.");
      } else {
        await createOrganization(payload);
        toast.success("Organisasi/faskes berhasil disimpan.");
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
            : "Organisasi tidak dapat disimpan.",
        duration: 7000,
      });
      return false;
    } finally {
      setSubmitting(null);
    }
  };

  const openStatusConfirmation = useCallback(
    (organization: OrganizationSummary) => {
      setStatusOrganization(organization);
    },
    [],
  );

  const confirmToggleStatus = useCallback(
    async (organization: OrganizationSummary) => {
      setStatusSubmitting(true);

      try {
        await updateOrganization(organization.id, {
          ...organizationToForm(organization),
          active: !organization.active,
          parentId: organization.parentId || undefined,
        });
        toast.success(
          organization.active
            ? "Organisasi/faskes dinonaktifkan."
            : "Organisasi/faskes diaktifkan.",
        );
        setStatusOrganization(null);
        await refreshList();
        await refreshOptions();
      } catch (toggleError) {
        toast.error("Status organisasi belum diperbarui", {
          description:
            toggleError instanceof Error
              ? toggleError.message
              : "Status organisasi tidak dapat diperbarui.",
          duration: 7000,
        });
      } finally {
        setStatusSubmitting(false);
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
        onLink: openLink,
        onEdit: openEdit,
        onToggleStatus: openStatusConfirmation,
      }),
    [canWrite, openEdit, openLink, openStatusConfirmation, organizations],
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openImport}
                  title="Ambil organisasi dari SATUSEHAT"
                >
                  <span className="flex h-5 w-5 overflow-hidden rounded bg-white" aria-hidden="true">
                    <Image
                      src="/satusehat.png"
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  Ambil dari SATUSEHAT
                </Button>
                <Button type="button" onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Tambah organisasi
                </Button>
              </div>
            ) : undefined
          }
        />
        <MasterFaskesSubnav />
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
              <MasterFaskesStatusFilter
                ariaLabel="Filter status organisasi"
                counts={statusCounts}
                value={statusFilter}
                onChange={handleStatusFilter}
                disabled={listLoading}
              />
              <SelectField
                id="organization-filter-type"
                aria-label="Filter jenis organisasi"
                size="sm"
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
          void refreshList();
          void refreshOptions();
        }}
      />
      <OrganizationLinkDialog
        open={linkOrganization !== null}
        organization={linkOrganization}
        canWrite={canWrite}
        onClose={() => setLinkOrganization(null)}
        onLinked={async () => {
          await refreshList();
          await refreshOptions();
        }}
      />
      <OrganizationImportDialog
        open={importDialogOpen}
        organizations={organizations}
        canWrite={canWrite}
        onClose={() => setImportDialogOpen(false)}
        onImported={async () => {
          await refreshList();
          await refreshOptions();
        }}
      />
      <OrganizationStatusAlert
        organization={statusOrganization}
        open={statusOrganization !== null}
        pending={statusSubmitting}
        onOpenChange={(open) => {
          if (!open && !statusSubmitting) setStatusOrganization(null);
        }}
        onConfirm={() => {
          if (statusOrganization) void confirmToggleStatus(statusOrganization);
        }}
      />
    </RouteGuard>
  );
}
