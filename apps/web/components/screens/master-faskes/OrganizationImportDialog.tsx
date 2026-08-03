"use client";

import { type SubmitEvent, useMemo, useState } from "react";
import type {
  OrganizationSummary,
  SatusehatOrganizationRemoteSummary,
} from "@mitrafaskes/shared";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSatusehatOrganizations } from "@/hooks/useSatusehatOrganizations";
import { MasterFaskesDialog } from "./MasterFaskesDialog";
import { OrganizationImportLocalPanel } from "./OrganizationImportLocalPanel";
import { OrganizationImportSearchPanel } from "./OrganizationImportSearchPanel";
import { SatusehatOrganizationResult } from "./SatusehatOrganizationResult";
import { toast } from "sonner";

type OrganizationImportDialogProps = {
  open: boolean;
  organizations: OrganizationSummary[];
  canWrite: boolean;
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

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
  const { search, importOrganization } = useSatusehatOrganizations();
  const parentOptions = useMemo(
    () => organizations.filter((organization) => organization.active),
    [organizations],
  );
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [searchParentId, setSearchParentId] = useState("");
  const [localParentId, setLocalParentId] = useState("");
  const [code, setCode] = useState("");
  const [items, setItems] = useState<SatusehatOrganizationRemoteSummary[]>([]);
  const [selected, setSelected] =
    useState<SatusehatOrganizationRemoteSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);

  const runSearch = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const queryId = externalId.trim();
    const queryName = name.trim();
    if (!queryId && !queryName && !searchParentId) {
      toast.error("Pencarian belum berhasil", {
        description: "Masukkan nama atau ID SATUSEHAT untuk mencari data.",
      });
      return;
    }

    setSearching(true);
    setSelected(null);
    try {
      const result = await search({
        id: queryId || undefined,
        name: queryId ? undefined : queryName || undefined,
        parentLocalId: searchParentId || undefined,
      });
      setItems(result.items);
      if (result.items.length === 0) {
        toast.info("Data organisasi tidak ditemukan", {
          description: "Coba gunakan nama yang lebih spesifik atau ID SATUSEHAT.",
        });
      }
    } catch (requestError) {
      setItems([]);
      toast.error("Pencarian SATUSEHAT gagal", {
        description:
          requestError instanceof Error
            ? requestError.message
            : "Data organisasi SATUSEHAT tidak dapat dicari.",
        duration: 7000,
      });
    } finally {
      setSearching(false);
    }
  };

  const selectItem = (item: SatusehatOrganizationRemoteSummary) => {
    setSelected(item);
    setLocalParentId(item.parentExternalResourceId ? searchParentId : "");
    setCode("");
  };

  const importSelected = async () => {
    if (!selected) return;
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error("Kode belum diisi", {
        description: "Isi kode singkat yang akan digunakan di aplikasi.",
      });
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(normalizedCode)) {
      toast.error("Format kode belum benar", {
        description:
          "Kode hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung tanpa spasi.",
      });
      return;
    }
    if (selected.parentExternalResourceId && !localParentId) {
      toast.error("Organisasi induk belum dipilih", {
        description: "Pilih organisasi lokal tempat data ini akan disimpan.",
      });
      return;
    }

    setImporting(true);
    try {
      const result = await importOrganization({
        externalResourceId: selected.externalResourceId,
        code: normalizedCode,
        parentId: selected.parentExternalResourceId
          ? localParentId || undefined
          : undefined,
      });
      setItems((current) =>
        current.map((item) =>
          item.externalResourceId === selected.externalResourceId
            ? { ...item, linkedLocalResourceId: result.localResourceId }
            : item,
        ),
      );
      setSelected((current) =>
        current
          ? { ...current, linkedLocalResourceId: result.localResourceId }
          : current,
      );
      toast.success("Data organisasi berhasil disimpan", {
        description:
          "Data berhasil disimpan ke Master Faskes dan dihubungkan ke SATUSEHAT.",
      });
      await onImported();
    } catch (requestError) {
      toast.error("Data organisasi belum tersimpan", {
        description:
          requestError instanceof Error
            ? requestError.message
            : "Data organisasi SATUSEHAT tidak dapat disimpan.",
        duration: 7000,
      });
    } finally {
      setImporting(false);
    }
  };

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
            <h3
              id="organization-import-results-title"
              className="text-sm font-bold text-foreground"
            >
              Pilih data yang benar
            </h3>
            {items.map((item) => (
              <SatusehatOrganizationResult
                key={item.externalResourceId}
                item={item}
                selected={
                  selected?.externalResourceId === item.externalResourceId
                }
                onSelect={() => selectItem(item)}
              />
            ))}
          </section>
        ) : null}

        {selected ? (
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
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
