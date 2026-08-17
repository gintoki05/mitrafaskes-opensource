'use client';

import { type SubmitEvent, useMemo, useState } from 'react';
import type {
  LocationSummary,
  OrganizationSummary,
  SatusehatLocationRemoteSummary,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { useSatusehatLocations } from '@/hooks/useSatusehatLocations';
import {
  defaultLocationCode,
  isValidLocationCode,
} from './location-import.helpers';

export const LOCATION_IMPORT_PAGE_SIZE = 8;

type UseLocationImportDialogOptions = {
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
  canWrite: boolean;
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

export function useLocationImportDialog({
  organizations,
  locations,
  canWrite,
  onClose,
  onImported,
}: UseLocationImportDialogOptions) {
  const { search, importLocation } = useSatusehatLocations();
  const activeOrganizations = useMemo(
    () => organizations.filter((organization) => organization.active),
    [organizations],
  );
  const defaultOrganizationId = useMemo(
    () =>
      activeOrganizations.find(
        (organization) =>
          organization.type === 'HEALTHCARE_FACILITY' &&
          !organization.parentId,
      )?.id ?? activeOrganizations[0]?.id ?? '',
    [activeOrganizations],
  );
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId);
  const [externalId, setExternalId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [items, setItems] = useState<SatusehatLocationRemoteSummary[]>([]);
  const [selected, setSelected] =
    useState<SatusehatLocationRemoteSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCodes, setBulkCodes] = useState<Record<string, string>>({});
  const [parentIds, setParentIds] = useState<Record<string, string>>({});
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);

  const parentOptions = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.organizationId === organizationId && location.active,
      ),
    [locations, organizationId],
  );
  const resetSelection = () => {
    setSelected(null);
    setSelectedIds([]);
    setBulkCodes({});
    setParentIds({});
    setCode('');
    setParentId('');
    setPage(1);
  };

  const runSearch = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const queryId = externalId.trim();
    const queryIdentifier = identifier.trim();
    const queryName = name.trim();
    if (!organizationId && !queryId && !queryIdentifier && !queryName) {
      toast.error('Pencarian belum berhasil', {
        description:
          'Pilih organisasi atau isi ID, kode, atau nama Location SATUSEHAT.',
      });
      return;
    }

    setSearching(true);
    resetSelection();
    try {
      const result = await search({
        id: queryId || undefined,
        identifier: queryId ? undefined : queryIdentifier || undefined,
        name: queryId ? undefined : queryName || undefined,
        organizationLocalId: organizationId || undefined,
      });
      setItems(result.items);
      if (result.items.length === 0) {
        toast.info('Location SATUSEHAT tidak ditemukan', {
          description: 'Coba gunakan kode atau nama yang lebih spesifik.',
        });
      }
    } catch (requestError) {
      setItems([]);
      toast.error('Pencarian SATUSEHAT gagal', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Data Location SATUSEHAT tidak dapat dicari.',
        duration: 7000,
      });
    } finally {
      setSearching(false);
    }
  };

  const selectItem = (item: SatusehatLocationRemoteSummary) => {
    const itemId = item.externalResourceId;
    const defaultCode = defaultLocationCode(item);
    const defaultParentId = item.parentLinkedLocalResourceId ?? '';
    setSelected(item);
    setSelectedIds([itemId]);
    setBulkCodes({ [itemId]: defaultCode });
    setParentIds({ [itemId]: defaultParentId });
    setCode(defaultCode);
    setParentId(defaultParentId);
  };

  const toggleItem = (
    item: SatusehatLocationRemoteSummary,
    checked: boolean,
  ) => {
    if (item.linkedLocalResourceId) return;

    const itemId = item.externalResourceId;
    const nextIds = checked
      ? Array.from(new Set([...selectedIds, itemId]))
      : selectedIds.filter((id) => id !== itemId);
    const nextItems = items.filter((candidate) =>
      nextIds.includes(candidate.externalResourceId),
    );
    const nextCodes = { ...bulkCodes };
    const nextParentIds = { ...parentIds };

    if (selected && code.trim()) {
      nextCodes[selected.externalResourceId] = code.trim();
    }
    if (checked) {
      if (!nextCodes[itemId]) nextCodes[itemId] = defaultLocationCode(item);
      if (!nextParentIds[itemId]) {
        nextParentIds[itemId] = item.parentLinkedLocalResourceId ?? '';
      }
    } else {
      delete nextCodes[itemId];
      delete nextParentIds[itemId];
    }

    setSelectedIds(nextIds);
    setBulkCodes(nextCodes);
    setParentIds(nextParentIds);

    if (nextIds.length === 0) {
      setSelected(null);
      setCode('');
      setParentId('');
    } else if (nextIds.length === 1) {
      const nextItem = nextItems[0];
      setSelected(nextItem ?? null);
      setCode(nextItem ? nextCodes[nextItem.externalResourceId] ?? '' : '');
      setParentId(
        nextItem ? nextParentIds[nextItem.externalResourceId] ?? '' : '',
      );
    } else {
      setSelected(null);
      setCode('');
      setParentId('');
    }
  };

  const toggleAll = (checked: boolean) => {
    const selectableItems = items.filter((item) => !item.linkedLocalResourceId);
    const nextItems = checked ? selectableItems : [];
    const nextIds = nextItems.map((item) => item.externalResourceId);
    const nextCodes = checked ? { ...bulkCodes } : {};
    const nextParentIds = checked ? { ...parentIds } : {};

    if (selected && code.trim()) {
      nextCodes[selected.externalResourceId] = code.trim();
    }
    for (const item of nextItems) {
      const itemId = item.externalResourceId;
      if (!nextCodes[itemId]) nextCodes[itemId] = defaultLocationCode(item);
      if (!nextParentIds[itemId]) {
        nextParentIds[itemId] = item.parentLinkedLocalResourceId ?? '';
      }
    }

    setSelectedIds(nextIds);
    setBulkCodes(nextCodes);
    setParentIds(nextParentIds);
    setSelected(nextItems.length === 1 ? nextItems[0] : null);
    setCode(nextItems.length === 1 ? nextCodes[nextIds[0]] ?? '' : '');
    setParentId(
      nextItems.length === 1 ? nextParentIds[nextIds[0]] ?? '' : '',
    );
  };

  const importSelected = async () => {
    if (!selected || !canWrite) return;
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error('Kode lokal belum diisi', {
        description: 'Isi kode yang akan digunakan di Master Faskes.',
      });
      return;
    }
    if (!isValidLocationCode(normalizedCode)) {
      toast.error('Format kode lokal belum benar', {
        description:
          'Kode hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung tanpa spasi.',
      });
      return;
    }
    if (selected.parentExternalResourceId && !parentId) {
      toast.error('Parent Location belum dipilih', {
        description:
          'Hubungkan atau pilih parent lokal yang sesuai sebelum menyimpan child Location.',
      });
      return;
    }

    setImporting(true);
    try {
      const result = await importLocation({
        externalResourceId: selected.externalResourceId,
        organizationId: organizationId || undefined,
        parentId: selected.parentExternalResourceId
          ? parentId || undefined
          : undefined,
        code: normalizedCode,
      });
      setItems((current) =>
        current.map((item) =>
          item.externalResourceId === selected.externalResourceId
            ? { ...item, linkedLocalResourceId: result.localResourceId }
            : item,
        ),
      );
      resetSelection();
      toast.success('Location berhasil diimpor', {
        description: 'Data lokal sudah dibuat dan dihubungkan ke SATUSEHAT.',
      });
      await onImported();
      onClose();
    } catch (requestError) {
      toast.error('Location belum diimpor', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Location SATUSEHAT tidak dapat disimpan.',
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
    if (selectedItems.length < 2 || !canWrite) return;

    const codeById = new Map<string, string>();
    for (const item of selectedItems) {
      const normalizedCode = (bulkCodes[item.externalResourceId] ?? '')
        .trim()
        .toUpperCase();
      if (!normalizedCode) {
        toast.error('Kode lokal belum lengkap', {
          description: `Isi kode lokal untuk ${item.name}.`,
        });
        return;
      }
      if (!isValidLocationCode(normalizedCode)) {
        toast.error('Format kode lokal belum benar', {
          description: `Kode lokal untuk ${item.name} tidak valid.`,
        });
        return;
      }
      if (
        item.parentExternalResourceId &&
        !(parentIds[item.externalResourceId] ?? '').trim()
      ) {
        toast.error('Parent Location belum lengkap', {
          description: `Pilih parent lokal yang sesuai untuk ${item.name}.`,
        });
        return;
      }
      codeById.set(item.externalResourceId, normalizedCode);
    }

    const codes = [...codeById.values()];
    if (new Set(codes).size !== codes.length) {
      toast.error('Kode lokal harus berbeda', {
        description:
          'Setiap Location dalam organisasi yang sama harus memiliki kode unik.',
      });
      return;
    }

    const failures: {
      item: SatusehatLocationRemoteSummary;
      message: string;
    }[] = [];
    let importedCount = 0;

    setImporting(true);
    try {
      for (const item of selectedItems) {
        try {
          const result = await importLocation({
            externalResourceId: item.externalResourceId,
            organizationId: organizationId || undefined,
            parentId: item.parentExternalResourceId
              ? parentIds[item.externalResourceId] || undefined
              : undefined,
            code: codeById.get(item.externalResourceId),
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
                : 'Data tidak dapat disimpan.',
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
        toast.error('Daftar lokal belum diperbarui', {
          description:
            'Data sudah diproses, tetapi daftar lokal perlu dimuat ulang.',
        });
      }
    }

    if (failures.length === 0) {
      resetSelection();
      toast.success(`${importedCount} Location berhasil disimpan`, {
        description:
          'Semua data pilihan sudah tersimpan di Master Faskes dan terhubung ke SATUSEHAT.',
      });
      return;
    }

    const failedItems = failures.map(({ item }) => item);
    setSelectedIds(failedItems.map((item) => item.externalResourceId));
    setBulkCodes(
      Object.fromEntries(
        failedItems.map((item) => [
          item.externalResourceId,
          codeById.get(item.externalResourceId) ?? '',
        ]),
      ),
    );
    setParentIds(
      Object.fromEntries(
        failedItems.map((item) => [
          item.externalResourceId,
          parentIds[item.externalResourceId] ??
            item.parentLinkedLocalResourceId ??
            '',
        ]),
      ),
    );
    if (failedItems.length === 1) {
      const failedItem = failedItems[0];
      setSelected(failedItem);
      setCode(codeById.get(failedItem.externalResourceId) ?? '');
      setParentId(
        parentIds[failedItem.externalResourceId] ??
          failedItem.parentLinkedLocalResourceId ??
          '',
      );
    } else {
      setSelected(null);
      setCode('');
      setParentId('');
    }

    const firstFailedIndex = items.findIndex(
      (item) => item.externalResourceId === failedItems[0]?.externalResourceId,
    );
    if (firstFailedIndex >= 0) {
      setPage(Math.floor(firstFailedIndex / LOCATION_IMPORT_PAGE_SIZE) + 1);
    }
    toast.error(`${importedCount} berhasil, ${failures.length} gagal`, {
      description: failures
        .map(({ item, message }) => `${item.name}: ${message}`)
        .join(' '),
      duration: 9000,
    });
  };

  const selectableItems = items.filter((item) => !item.linkedLocalResourceId);
  const selectedImportItems = items.filter((item) =>
    selectedIds.includes(item.externalResourceId),
  );
  const selectedCount = selectedImportItems.filter(
    (item) => !item.linkedLocalResourceId,
  ).length;
  const allSelectableSelected =
    selectableItems.length > 0 && selectedCount === selectableItems.length;
  const someSelectableSelected = selectedCount > 0 && !allSelectableSelected;
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / LOCATION_IMPORT_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (currentPage - 1) * LOCATION_IMPORT_PAGE_SIZE,
    currentPage * LOCATION_IMPORT_PAGE_SIZE,
  );
  const pageStart =
    items.length > 0
      ? (currentPage - 1) * LOCATION_IMPORT_PAGE_SIZE + 1
      : 0;
  const pageEnd = Math.min(currentPage * LOCATION_IMPORT_PAGE_SIZE, items.length);

  return {
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
    code,
    setCode,
    parentId,
    setParentId,
    page: currentPage,
    setPage,
    totalPages,
    pageStart,
    pageEnd,
    selectableCount: selectableItems.length,
    selectedCount,
    allSelectableSelected,
    someSelectableSelected,
    parentOptions,
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
    resetSelection,
  };
}
