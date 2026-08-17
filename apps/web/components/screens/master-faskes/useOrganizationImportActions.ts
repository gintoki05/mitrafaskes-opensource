"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  SatusehatOrganizationImportRequest,
  SatusehatOrganizationMutationResponse,
  SatusehatOrganizationRemoteSummary,
} from "@mitrafaskes/shared";
import { toast } from "sonner";

type UseOrganizationImportActionsOptions = {
  importOrganization: (
    input: SatusehatOrganizationImportRequest,
  ) => Promise<SatusehatOrganizationMutationResponse>;
  items: SatusehatOrganizationRemoteSummary[];
  selected: SatusehatOrganizationRemoteSummary | null;
  selectedIds: string[];
  bulkCodes: Record<string, string>;
  code: string;
  localParentId: string;
  setItems: Dispatch<SetStateAction<SatusehatOrganizationRemoteSummary[]>>;
  setSelected: Dispatch<
    SetStateAction<SatusehatOrganizationRemoteSummary | null>
  >;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setBulkCodes: Dispatch<SetStateAction<Record<string, string>>>;
  setCode: Dispatch<SetStateAction<string>>;
  setLocalParentId: Dispatch<SetStateAction<string>>;
  setImporting: Dispatch<SetStateAction<boolean>>;
  resetSelection: () => void;
  onImported: () => void | Promise<void>;
};

export function useOrganizationImportActions({
  importOrganization,
  items,
  selected,
  selectedIds,
  bulkCodes,
  code,
  localParentId,
  setItems,
  setSelected,
  setSelectedIds,
  setBulkCodes,
  setCode,
  setLocalParentId,
  setImporting,
  resetSelection,
  onImported,
}: UseOrganizationImportActionsOptions) {
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
      resetSelection();
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

  return { importSelected, importSelectedBulk };
}
