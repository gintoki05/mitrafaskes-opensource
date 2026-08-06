'use client';

import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from '@mitrafaskes/shared';
import { Download, RefreshCw, Search } from 'lucide-react';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComboboxField } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { FieldLabel } from './FormField';
import { LocationImportBulkPanel } from './LocationImportBulkPanel';
import { LocationImportResults } from './LocationImportResults';
import { MasterFaskesDialog } from './MasterFaskesDialog';
import { useLocationImportDialog } from './useLocationImportDialog';

type LocationImportDialogProps = {
  open: boolean;
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
  serviceUnits: ServiceUnitSummary[];
  canWrite: boolean;
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

export function LocationImportDialog({
  open,
  organizations,
  locations,
  serviceUnits,
  canWrite,
  onClose,
  onImported,
}: LocationImportDialogProps) {
  if (!open) return null;

  return (
    <MasterFaskesDialog
      open
      label="Ambil Location dari SATUSEHAT"
      onClose={onClose}
      className="max-w-4xl"
    >
      <LocationImportDialogContent
        organizations={organizations}
        locations={locations}
        serviceUnits={serviceUnits}
        canWrite={canWrite}
        onClose={onClose}
        onImported={onImported}
      />
    </MasterFaskesDialog>
  );
}

function LocationImportDialogContent({
  organizations,
  locations,
  serviceUnits,
  canWrite,
  onClose,
  onImported,
}: Omit<LocationImportDialogProps, 'open'>) {
  const {
    activeOrganizations,
    organizationId,
    setOrganizationId,
    externalId,
    setExternalId,
    identifier,
    setIdentifier,
    name,
    setName,
    items,
    setItems,
    pageItems,
    selected,
    selectedIds,
    selectedImportItems,
    bulkCodes,
    parentIds,
    serviceUnitIds,
    code,
    setCode,
    parentId,
    setParentId,
    serviceUnitId,
    setServiceUnitId,
    page,
    setPage,
    totalPages,
    pageStart,
    pageEnd,
    selectableCount,
    selectedCount,
    allSelectableSelected,
    someSelectableSelected,
    parentOptions,
    serviceUnitOptions,
    searching,
    importing,
    runSearch,
    selectItem,
    toggleItem,
    toggleAll,
    importSelected,
    importSelectedBulk,
    setBulkCodes,
    setParentIds,
    setServiceUnitIds,
    resetSelection,
  } = useLocationImportDialog({
    organizations,
    locations,
    serviceUnits,
    canWrite,
    onClose,
    onImported,
  });

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Download className="h-4 w-4 text-primary" aria-hidden="true" />
          Ambil Location dari SATUSEHAT
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cari Location yang sudah terdaftar, lalu simpan salinannya ke Master
          Faskes sekaligus membuat linkage SATUSEHAT.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <form className="space-y-3" onSubmit={(event) => void runSearch(event)}>
          <div>
            <FieldLabel htmlFor="satusehat-location-organization">
              Organisasi lokal
            </FieldLabel>
            <ComboboxField
              id="satusehat-location-organization"
              value={organizationId}
              onChange={(value) => {
                setOrganizationId(value);
                setItems([]);
                resetSelection();
              }}
              placeholder="Pilih organisasi"
              options={activeOrganizations.map((organization) => ({
                value: organization.id,
                label: `${organization.code} - ${organization.name}`,
              }))}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Organisasi harus sudah terhubung ke SATUSEHAT agar Location dapat
              dicari dan diimpor.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="satusehat-location-name">Nama</FieldLabel>
              <Input
                id="satusehat-location-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Poli Umum"
              />
            </div>
            <div>
              <FieldLabel htmlFor="satusehat-location-identifier">
                Kode Location
              </FieldLabel>
              <Input
                id="satusehat-location-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Contoh: POLI-UMUM"
              />
            </div>
            <div>
              <FieldLabel htmlFor="satusehat-location-id">
                ID SATUSEHAT
              </FieldLabel>
              <Input
                id="satusehat-location-id"
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                placeholder="UUID Location"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={searching} aria-busy={searching}>
              {searching ? (
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Cari Location
            </Button>
          </div>
        </form>

        {searching ? (
          <ScreenState
            kind="loading"
            title="Mencari Location SATUSEHAT"
            description="Data yang cocok sedang diambil."
            compact
          />
        ) : items.length > 0 ? (
          <LocationImportResults
            items={pageItems}
            selectedIds={selectedIds}
            selectedId={selected?.externalResourceId}
            selectableCount={selectableCount}
            selectedCount={selectedCount}
            allSelectableSelected={allSelectableSelected}
            someSelectableSelected={someSelectableSelected}
            page={page}
            totalPages={totalPages}
            pageStart={pageStart}
            pageEnd={pageEnd}
            totalItems={items.length}
            onToggleAll={toggleAll}
            onToggleItem={toggleItem}
            onSelect={selectItem}
            onPageChange={(nextPage) => {
              if (nextPage >= 1 && nextPage <= totalPages) {
                setPage(nextPage);
              }
            }}
          />
        ) : null}

        {selectedImportItems.length > 1 ? (
          <LocationImportBulkPanel
            items={selectedImportItems}
            parentOptions={parentOptions}
            serviceUnitOptions={serviceUnitOptions}
            codes={bulkCodes}
            parentIds={parentIds}
            serviceUnitIds={serviceUnitIds}
            canWrite={canWrite}
            importing={importing}
            onCodeChange={(externalResourceId, value) =>
              setBulkCodes((current) => ({
                ...current,
                [externalResourceId]: value,
              }))
            }
            onParentChange={(externalResourceId, value) =>
              setParentIds((current) => ({
                ...current,
                [externalResourceId]: value,
              }))
            }
            onServiceUnitChange={(externalResourceId, value) =>
              setServiceUnitIds((current) => ({
                ...current,
                [externalResourceId]: value,
              }))
            }
            onImport={() => void importSelectedBulk()}
          />
        ) : selected ? (
          <Card className="border-primary/25 bg-primary/[0.03]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pengaturan data lokal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel htmlFor="satusehat-location-local-code">
                  Kode lokal
                </FieldLabel>
                <Input
                  id="satusehat-location-local-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  maxLength={64}
                />
              </div>
              <div>
                <FieldLabel htmlFor="satusehat-location-parent">
                  Lokasi induk lokal
                </FieldLabel>
                <ComboboxField
                  id="satusehat-location-parent"
                  value={parentId}
                  onChange={setParentId}
                  placeholder="Root / pilih parent"
                  clearable
                  options={parentOptions.map((location) => ({
                    value: location.id,
                    label: `${location.code} - ${location.name}`,
                  }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="satusehat-location-service-unit">
                  Unit layanan lokal
                </FieldLabel>
                <ComboboxField
                  id="satusehat-location-service-unit"
                  value={serviceUnitId}
                  onChange={setServiceUnitId}
                  placeholder="Tidak ditetapkan"
                  clearable
                  options={serviceUnitOptions.map((serviceUnit) => ({
                    value: serviceUnit.id,
                    label: `${serviceUnit.code} - ${serviceUnit.name}`,
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {canWrite ? (
            <Button
              type="button"
              onClick={() => void importSelected()}
              disabled={!selected || importing}
              aria-busy={importing}
            >
              {importing ? (
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {importing ? 'Mengimpor...' : 'Simpan & hubungkan'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
