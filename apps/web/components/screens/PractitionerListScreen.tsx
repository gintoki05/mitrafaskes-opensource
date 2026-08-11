'use client';

import { type SubmitEvent, useCallback, useMemo, useState } from 'react';
import { Plus, Stethoscope } from 'lucide-react';
import type {
  MasterDataListQuery,
  PractitionerSummary,
} from '@mitrafaskes/shared';
import { AccessPermission } from '@mitrafaskes/shared';
import { PageHeader } from '@/components/PageHeader';
import { RouteGuard } from '@/components/RouteGuard';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { useMasterFaskesData } from '@/hooks/useMasterFaskesData';
import { usePractitioners } from '@/hooks/usePractitioners';
import { can } from '@/lib/auth';
import { MasterFaskesSubnav } from './master-faskes/MasterFaskesSubnav';
import { MasterFaskesTable } from './master-faskes/MasterFaskesTable';
import { MasterFaskesStatusFilter } from './master-faskes/MasterFaskesStatusFilter';
import { PractitionerCreateDialog } from './master-faskes/PractitionerCreateDialog';
import { PractitionerLinkDialog } from './master-faskes/PractitionerLinkDialog';
import { PractitionerProfileDialog } from './master-faskes/PractitionerProfileDialog';
import { getPractitionerColumns } from './master-faskes/practitionerColumns';

const initialQuery: MasterDataListQuery = {
  page: 1,
  pageSize: 25,
  sort: 'name',
  direction: 'asc',
};

export default function PractitionerListScreen() {
  const session = useSession();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const canWrite = can(
    session?.user ?? null,
    AccessPermission.MASTER_DATA_WRITE,
  );
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(
    undefined,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [linkPractitioner, setLinkPractitioner] =
    useState<PractitionerSummary | null>(null);
  const [editingPractitioner, setEditingPractitioner] =
    useState<PractitionerSummary | null>(null);

  const {
    items,
    meta,
    loading,
    error,
    refresh,
    statusCounts,
  } = usePractitioners(query);
  const { organizations, locations } = useMasterFaskesData();

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

  const clearFilters = () => {
    setSearchDraft('');
    setStatusFilter(undefined);
    setQuery(initialQuery);
  };

  const openLink = useCallback((practitioner: PractitionerSummary) => {
    setLinkPractitioner(practitioner);
  }, []);

  const openEdit = useCallback((practitioner: PractitionerSummary) => {
    setEditingPractitioner(practitioner);
  }, []);

  const columns = useMemo(
    () =>
      getPractitionerColumns({
        canWrite,
        integrationEnabled: satusehat.available,
        onLink: openLink,
        onEdit: openEdit,
      }),
    [canWrite, openEdit, openLink, satusehat.available],
  );

  const refreshAfterMutation = async () => {
    await refresh();
  };

  return (
    <RouteGuard permission={AccessPermission.MASTER_DATA_READ}>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <PageHeader
          icon={<Stethoscope className="h-6 w-6" />}
          title="Practitioner / Tenaga Kesehatan"
          description="Kelola profil dokter dan perawat secara lokal; sinkronisasi ke provider eksternal tersedia bila integrasi diaktifkan."
          action={
            canWrite ? (
              <Button type="button" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah Practitioner
              </Button>
            ) : undefined
          }
        />
        <MasterFaskesSubnav />
        <MasterFaskesTable
          caption="Daftar Practitioner / tenaga kesehatan"
          emptyTitle="Belum ada tenaga kesehatan"
          emptyDescription="User dengan peran dokter atau perawat akan tampil di sini."
          data={items}
          columns={columns}
          meta={meta}
          loading={loading}
          error={error}
          search={searchDraft}
          searchLabel="Cari nama, username, atau NIK tenaga kesehatan"
          onSearchChange={setSearchDraft}
          onSearchSubmit={handleSearchSubmit}
          filters={
            <MasterFaskesStatusFilter
              ariaLabel="Filter status Practitioner"
              counts={statusCounts}
              value={statusFilter}
              onChange={handleStatusFilter}
              disabled={loading}
            />
          }
          hasActiveFilters={Boolean(query.search || query.active !== undefined)}
          onClearFilters={clearFilters}
          onRefresh={() => void refresh()}
          sort={query.sort}
          direction={query.direction}
          onSortChange={(sort, direction) => setFilters({ sort, direction })}
          onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
        />
        {!canWrite ? (
          <div className="rounded-[var(--radius-card)] border border-info/20 bg-info/5 p-4 text-xs text-info">
            <strong>Akses baca saja.</strong> Admin perlu mengisi NIK dan
            menghubungkan Practitioner ke provider eksternal bila diperlukan.
          </div>
        ) : null}
      </div>
      <PractitionerLinkDialog
        open={satusehat.configured && linkPractitioner !== null}
        practitioner={linkPractitioner}
        canWrite={canWrite}
        onClose={() => setLinkPractitioner(null)}
        onLinked={refreshAfterMutation}
      />
      <PractitionerCreateDialog
        open={createDialogOpen}
        canWrite={canWrite}
        organizations={organizations}
        locations={locations}
        onClose={() => setCreateDialogOpen(false)}
        onSaved={refreshAfterMutation}
      />
      <PractitionerProfileDialog
        open={editingPractitioner !== null}
        practitioner={editingPractitioner}
        canWrite={canWrite}
        organizations={organizations}
        locations={locations}
        onClose={() => setEditingPractitioner(null)}
        onSaved={refreshAfterMutation}
      />
    </RouteGuard>
  );
}
