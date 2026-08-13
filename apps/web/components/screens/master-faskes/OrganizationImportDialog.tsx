"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MasterFaskesDialog } from "./MasterFaskesDialog";
import { OrganizationImportBulkPanel } from "./OrganizationImportBulkPanel";
import { OrganizationImportLocalPanel } from "./OrganizationImportLocalPanel";
import { OrganizationImportSearchPanel } from "./OrganizationImportSearchPanel";
import { SatusehatOrganizationResult } from "./SatusehatOrganizationResult";
import {
  type OrganizationImportDialogProps,
  useOrganizationImportDialog,
} from "./useOrganizationImportDialog";

export function OrganizationImportDialog({
  open,
  organizations,
  canWrite,
  onClose,
  onImported,
}: OrganizationImportDialogProps) {
  if (!open) return null;

  return (
    <MasterFaskesDialog
      open
      label="Ambil organisasi dari SATUSEHAT"
      onClose={onClose}
      className="max-w-4xl"
    >
      <OrganizationImportDialogContent
        organizations={organizations}
        canWrite={canWrite}
        onClose={onClose}
        onImported={onImported}
      />
    </MasterFaskesDialog>
  );
}

function OrganizationImportDialogContent({
  organizations,
  canWrite,
  onClose,
  onImported,
}: Omit<OrganizationImportDialogProps, "open">) {
  const {
    parentOptions,
    externalId,
    name,
    searchParentId,
    localParentId,
    code,
    items,
    selected,
    selectedIds,
    bulkCodes,
    searching,
    importing,
    selectedImportItems,
    selectableItems,
    selectedSelectableCount,
    allSelectableSelected,
    someSelectableSelected,
    requestClose,
    runSearch,
    selectItem,
    toggleItem,
    toggleAll,
    importSelected,
    importSelectedBulk,
    setExternalId,
    setName,
    setSearchParentId,
    setLocalParentId,
    setCode,
    setBulkCode,
  } = useOrganizationImportDialog({
    organizations,
    canWrite,
    onClose,
    onImported,
  });

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Download className="h-4 w-4 text-primary" aria-hidden="true" />
          Ambil organisasi dari SATUSEHAT
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cari data yang sudah terdaftar di SATUSEHAT, lalu simpan salinannya ke
          Master Faskes agar dapat digunakan di aplikasi.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <OrganizationImportSearchPanel
          parentOptions={parentOptions}
          externalId={externalId}
          name={name}
          searchParentId={searchParentId}
          searching={searching}
          onExternalIdChange={setExternalId}
          onNameChange={setName}
          onSearchParentChange={setSearchParentId}
          onSubmit={(event) => void runSearch(event)}
        />

        {items.length > 0 ? (
          <section
            className="space-y-2"
            aria-labelledby="organization-import-results-title"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3
                  id="organization-import-results-title"
                  className="text-sm font-bold text-foreground"
                >
                  Pilih data yang benar
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSelectableCount > 0
                    ? `${selectedSelectableCount} data dipilih`
                    : "Pilih satu, beberapa, atau semua data yang belum terhubung."}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Checkbox
                  checked={allSelectableSelected}
                  indeterminate={someSelectableSelected}
                  disabled={selectableItems.length === 0}
                  onCheckedChange={toggleAll}
                  aria-label="Pilih semua Organization yang belum terhubung"
                />
                {selectableItems.length > 0
                  ? "Pilih semua"
                  : "Semua sudah terhubung"}
              </label>
            </div>
            {items.map((item) => (
              <SatusehatOrganizationResult
                key={item.externalResourceId}
                item={item}
                selected={
                  selected?.externalResourceId === item.externalResourceId
                }
                checked={selectedIds.includes(item.externalResourceId)}
                onSelect={() => selectItem(item)}
                onCheckedChange={(checked) => toggleItem(item, checked)}
              />
            ))}
          </section>
        ) : null}

        {selectedImportItems.length > 1 ? (
          <OrganizationImportBulkPanel
            items={selectedImportItems}
            parentOptions={parentOptions}
            codes={bulkCodes}
            localParentId={localParentId}
            canWrite={canWrite}
            importing={importing}
            onCodeChange={setBulkCode}
            onLocalParentChange={setLocalParentId}
            onImport={() => void importSelectedBulk()}
          />
        ) : selected ? (
          <OrganizationImportLocalPanel
            selected={selected}
            parentOptions={parentOptions}
            code={code}
            localParentId={localParentId}
            canWrite={canWrite}
            importing={importing}
            onCodeChange={setCode}
            onLocalParentChange={setLocalParentId}
            onImport={() => void importSelected()}
          />
        ) : null}

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={requestClose}>
            Tutup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
