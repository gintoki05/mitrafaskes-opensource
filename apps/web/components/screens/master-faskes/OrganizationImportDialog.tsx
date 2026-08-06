"use client";

import {
  type SubmitEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  OrganizationSummary,
  SatusehatOrganizationRemoteSummary,
} from "@mitrafaskes/shared";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useSatusehatOrganizations } from "@/hooks/useSatusehatOrganizations";
import { MasterFaskesDialog } from "./MasterFaskesDialog";
import { OrganizationImportBulkPanel } from "./OrganizationImportBulkPanel";
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
  const defaultSearchParentId = useMemo(
    () =>
      parentOptions.find(
        (organization) =>
          organization.type === "HEALTHCARE_FACILITY" && !organization.parentId,
      )?.id ?? "",
    [parentOptions],
  );
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [searchParentId, setSearchParentId] = useState(defaultSearchParentId);
  const [localParentId, setLocalParentId] = useState("");
  const [code, setCode] = useState("");
  const [items, setItems] = useState<SatusehatOrganizationRemoteSummary[]>([]);
  const [selected, setSelected] =
    useState<SatusehatOrganizationRemoteSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCodes, setBulkCodes] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);

  const resetSelection = useCallback(() => {
    setSelected(null);
    setSelectedIds([]);
    setBulkCodes({});
    setLocalParentId("");
    setCode("");
  }, []);

  const loadChildren = useCallback(
    async (parentId: string) => {
      setSearching(true);
      resetSelection();
      try {
        const result = await search({ parentLocalId: parentId });
        setItems(result.items);
      } catch (requestError) {
        setItems([]);
        toast.error("Suborganisasi SATUSEHAT gagal dimuat", {
          description:
            requestError instanceof Error
              ? requestError.message
              : "Daftar suborganisasi tidak dapat dimuat.",
          duration: 7000,
        });
      } finally {
        setSearching(false);
      }
    },
    [resetSelection, search],
  );

  useEffect(() => {
    if (!searchParentId) return;

    const timeoutId = window.setTimeout(() => {
      void loadChildren(searchParentId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadChildren, searchParentId]);

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
    resetSelection();
    try {
      const result = await search({
        id: queryId || undefined,
        name: queryId ? undefined : queryName || undefined,
        parentLocalId: searchParentId || undefined,
      });
      setItems(result.items);
      if (result.items.length === 0) {
        toast.info("Data organisasi tidak ditemukan", {
          description:
            "Coba gunakan nama yang lebih spesifik atau ID SATUSEHAT.",
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
    setSelectedIds([item.externalResourceId]);
    setBulkCodes({
      [item.externalResourceId]: defaultBulkCode(item),
    });
    setLocalParentId(item.parentExternalResourceId ? searchParentId : "");
    setCode("");
  };

  const toggleItem = (
    item: SatusehatOrganizationRemoteSummary,
    checked: boolean,
  ) => {
    if (item.linkedLocalResourceId) return;

    const nextIds = checked
      ? Array.from(new Set([...selectedIds, item.externalResourceId]))
      : selectedIds.filter((id) => id !== item.externalResourceId);
    const nextItems = items.filter((candidate) =>
      nextIds.includes(candidate.externalResourceId),
    );
    const nextCodes = { ...bulkCodes };

    if (selected && code.trim()) {
      nextCodes[selected.externalResourceId] = code.trim();
    }
    if (checked && !nextCodes[item.externalResourceId]) {
      nextCodes[item.externalResourceId] = defaultBulkCode(item);
    }
    if (!checked) delete nextCodes[item.externalResourceId];

    setSelectedIds(nextIds);
    setBulkCodes(nextCodes);
    setLocalParentId(
      nextItems.some((candidate) => candidate.parentExternalResourceId)
        ? searchParentId
        : "",
    );

    if (nextIds.length === 0) {
      setSelected(null);
      setCode("");
    } else if (nextIds.length === 1) {
      const nextItem = nextItems[0];
      setSelected(nextItem ?? null);
      setCode(selectedIds.length > 1 ? (nextCodes[nextIds[0]] ?? "") : "");
    } else {
      setSelected(null);
      setCode("");
    }
  };

  const toggleAll = (checked: boolean) => {
    const selectableItems = items.filter((item) => !item.linkedLocalResourceId);
    const nextItems = checked ? selectableItems : [];
    const nextIds = nextItems.map((item) => item.externalResourceId);
    const nextCodes = checked ? { ...bulkCodes } : {};

    if (selected && code.trim()) {
      nextCodes[selected.externalResourceId] = code.trim();
    }
    for (const item of nextItems) {
      if (!nextCodes[item.externalResourceId]) {
        nextCodes[item.externalResourceId] = defaultBulkCode(item);
      }
    }

    setSelectedIds(nextIds);
    setBulkCodes(nextCodes);
    setSelected(nextItems.length === 1 ? nextItems[0] : null);
    setCode("");
    setLocalParentId(
      nextItems.some((item) => item.parentExternalResourceId)
        ? searchParentId
        : "",
    );
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
      setSelectedIds((current) =>
        current.filter((id) => id !== selected.externalResourceId),
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

  const importSelectedBulk = async () => {
    const selectedItems = items.filter((item) =>
      selectedIds.includes(item.externalResourceId),
    );
    if (selectedItems.length < 2) return;

    const remoteParentKeys = new Set(
      selectedItems.map((item) => item.parentExternalResourceId ?? "__root__"),
    );
    if (remoteParentKeys.size > 1) {
      toast.error("Induk organisasi tidak sama", {
        description:
          "Pilih data dengan induk SATUSEHAT yang sama sebelum menyimpan sekaligus.",
      });
      return;
    }

    const codeById = new Map<string, string>();
    for (const item of selectedItems) {
      const normalizedCode = (bulkCodes[item.externalResourceId] ?? "")
        .trim()
        .toUpperCase();
      if (!normalizedCode) {
        toast.error("Kode lokal belum lengkap", {
          description: `Isi kode lokal untuk ${item.name}.`,
        });
        return;
      }
      if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(normalizedCode)) {
        toast.error("Format kode belum benar", {
          description: `Kode lokal untuk ${item.name} tidak valid.`,
        });
        return;
      }
      codeById.set(item.externalResourceId, normalizedCode);
    }

    const codes = [...codeById.values()];
    if (new Set(codes).size !== codes.length) {
      toast.error("Kode lokal harus berbeda", {
        description:
          "Setiap Organization yang dipilih harus memiliki kode unik.",
      });
      return;
    }

    const requiresLocalParent = selectedItems.some(
      (item) => item.parentExternalResourceId,
    );
    if (requiresLocalParent && !localParentId) {
      toast.error("Organisasi induk belum dipilih", {
        description: "Pilih organisasi lokal tempat data ini akan disimpan.",
      });
      return;
    }

    const failures: {
      item: SatusehatOrganizationRemoteSummary;
      message: string;
    }[] = [];
    let importedCount = 0;

    setImporting(true);
    try {
      for (const item of selectedItems) {
        try {
          const result = await importOrganization({
            externalResourceId: item.externalResourceId,
            code: codeById.get(item.externalResourceId) ?? "",
            parentId: item.parentExternalResourceId
              ? localParentId || undefined
              : undefined,
          });
          importedCount += 1;
          setItems((current) =>
            current.map((currentItem) =>
              currentItem.externalResourceId === item.externalResourceId
                ? {
                    ...currentItem,
                    linkedLocalResourceId: result.localResourceId,
                  }
                : currentItem,
            ),
          );
        } catch (requestError) {
          failures.push({
            item,
            message:
              requestError instanceof Error
                ? requestError.message
                : "Data tidak dapat disimpan.",
          });
        }
      }
    } finally {
      setImporting(false);
    }

    if (importedCount > 0) {
      try {
        await onImported();
      } catch {
        toast.error("Daftar lokal belum diperbarui", {
          description:
            "Data sudah diproses, tetapi daftar lokal perlu dimuat ulang.",
        });
      }
    }

    if (failures.length === 0) {
      resetSelection();
      toast.success(`${importedCount} organisasi berhasil disimpan`, {
        description:
          "Semua data pilihan sudah tersimpan di Master Faskes dan terhubung ke SATUSEHAT.",
      });
      return;
    }

    const failedItems = failures.map(({ item }) => item);
    setSelectedIds(failedItems.map((item) => item.externalResourceId));
    setBulkCodes(
      Object.fromEntries(
        failedItems.map((item) => [
          item.externalResourceId,
          codeById.get(item.externalResourceId) ?? "",
        ]),
      ),
    );
    if (failedItems.length === 1) {
      const failedItem = failedItems[0];
      setSelected(failedItem);
      setCode(codeById.get(failedItem.externalResourceId) ?? "");
      setLocalParentId(
        failedItem.parentExternalResourceId ? localParentId : "",
      );
    } else {
      setSelected(null);
      setCode("");
    }
    toast.error(`${importedCount} berhasil, ${failures.length} gagal`, {
      description: failures
        .map(({ item, message }) => `${item.name}: ${message}`)
        .join(" "),
      duration: 9000,
    });
  };

  const selectableItems = items.filter((item) => !item.linkedLocalResourceId);
  const selectedImportItems = items.filter((item) =>
    selectedIds.includes(item.externalResourceId),
  );
  const selectedSelectableCount = selectedImportItems.filter(
    (item) => !item.linkedLocalResourceId,
  ).length;
  const allSelectableSelected =
    selectableItems.length > 0 &&
    selectedSelectableCount === selectableItems.length;
  const someSelectableSelected =
    selectedSelectableCount > 0 && !allSelectableSelected;

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
            onCodeChange={(externalResourceId, value) =>
              setBulkCodes((current) => ({
                ...current,
                [externalResourceId]: value,
              }))
            }
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
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function defaultBulkCode(item: SatusehatOrganizationRemoteSummary): string {
  const source = item.identifiers[0]?.value || item.name;
  const normalized = source
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 64) || "ORGANIZATION";
}
