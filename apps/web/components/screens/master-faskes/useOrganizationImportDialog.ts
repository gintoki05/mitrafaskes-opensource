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
import { toast } from "sonner";
import { useSatusehatOrganizations } from "@/hooks/useSatusehatOrganizations";
import {
  useMasterFaskesDialogClose,
  useMasterFaskesDialogGuard,
} from "./MasterFaskesDialog";
import { useOrganizationImportActions } from "./useOrganizationImportActions";

export type OrganizationImportDialogProps = {
  open: boolean;
  organizations: OrganizationSummary[];
  canWrite: boolean;
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

type UseOrganizationImportDialogOptions = Omit<
  OrganizationImportDialogProps,
  "open"
>;

export function useOrganizationImportDialog({
  organizations,
  canWrite,
  onClose,
  onImported,
}: UseOrganizationImportDialogOptions) {
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
  const requestClose = useMasterFaskesDialogClose(onClose);

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

  const { importSelected, importSelectedBulk } = useOrganizationImportActions({
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
  });

  const hasUnsavedChanges =
    externalId.trim() !== "" ||
    name.trim() !== "" ||
    searchParentId !== defaultSearchParentId ||
    localParentId !== "" ||
    code.trim() !== "" ||
    selectedIds.length > 0 ||
    Object.values(bulkCodes).some((value) => value.trim() !== "");

  useMasterFaskesDialogGuard({
    hasUnsavedChanges: canWrite && hasUnsavedChanges,
    isBusy: importing,
  });

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

  const setBulkCode = useCallback(
    (externalResourceId: string, value: string) => {
      setBulkCodes((current) => ({
        ...current,
        [externalResourceId]: value,
      }));
    },
    [],
  );

  return {
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
  };
}

function defaultBulkCode(item: SatusehatOrganizationRemoteSummary): string {
  const source = item.identifiers[0]?.value || item.name;
  const normalized = source
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 64) || "ORGANIZATION";
}
