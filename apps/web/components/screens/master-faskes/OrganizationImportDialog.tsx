"use client";

import { type SubmitEvent, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import type {
  OrganizationSummary,
  SatusehatOrganizationRemoteSummary,
} from "@mitrafaskes/shared";
import { ScreenState } from "@/components/ScreenState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSatusehatOrganizations } from "@/hooks/useSatusehatOrganizations";
import { FieldLabel, SelectField } from "./FormField";
import { MasterFaskesDialog } from "./MasterFaskesDialog";
import { SatusehatOrganizationResult } from "./SatusehatOrganizationResult";

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
      label="Impor Organization dari SATUSEHAT"
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
  const defaultParentId =
    parentOptions.find((organization) => !organization.parentId)?.id ?? "";
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(defaultParentId);
  const [code, setCode] = useState("");
  const [items, setItems] = useState<SatusehatOrganizationRemoteSummary[]>([]);
  const [selected, setSelected] =
    useState<SatusehatOrganizationRemoteSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const runSearch = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const queryId = externalId.trim();
    const queryName = name.trim();
    if (!queryId && !queryName && !parentId) {
      setError("Isi ID, nama, atau pilih organisasi induk untuk mencari.");
      return;
    }

    setSearching(true);
    setError("");
    setSuccess("");
    setSelected(null);
    try {
      const result = await search({
        id: queryId || undefined,
        name: queryId ? undefined : queryName || undefined,
        parentLocalId: parentId || undefined,
      });
      setItems(result.items);
      if (result.items.length === 0) {
        setError("Tidak ada Organization yang cocok di SATUSEHAT.");
      }
    } catch (requestError) {
      setItems([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Organization SATUSEHAT tidak dapat dicari.",
      );
    } finally {
      setSearching(false);
    }
  };

  const selectItem = (item: SatusehatOrganizationRemoteSummary) => {
    setSelected(item);
    if (!item.parentExternalResourceId) setParentId("");
    setCode(defaultLocalCode(item));
    setError("");
    setSuccess("");
  };

  const importSelected = async () => {
    if (!selected) return;
    if (!code.trim()) {
      setError("Kode lokal wajib diisi.");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");
    try {
      const result = await importOrganization({
        externalResourceId: selected.externalResourceId,
        code: code.trim(),
        parentId: selected.parentExternalResourceId
          ? parentId || undefined
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
      setSuccess(
        `Organization berhasil diimpor sebagai ${result.organization.code}.`,
      );
      await onImported();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Organization SATUSEHAT tidak dapat diimpor.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Download className="h-4 w-4 text-primary" aria-hidden="true" />
          Impor Organization dari SATUSEHAT
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Gunakan ID Organization SATUSEHAT untuk mengambil resource yang sudah
          ada. Parent lokal wajib sesuai dengan Organization.partOf untuk
          sub-organisasi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {success ? (
          <ScreenState
            kind="success"
            title="Import berhasil"
            description={success}
            compact
          />
        ) : null}
        {error ? (
          <ScreenState
            kind="error"
            title="Import belum berhasil"
            description={error}
            compact
          />
        ) : null}
        <form
          className="grid gap-3"
          onSubmit={(event) => void runSearch(event)}
        >
          <div>
            <FieldLabel htmlFor="satusehat-import-id">
              ID Organization SATUSEHAT
            </FieldLabel>
            <Input
              id="satusehat-import-id"
              value={externalId}
              onChange={(event) => setExternalId(event.target.value)}
              placeholder="Contoh: a43fa518-..."
            />
          </div>
          <div>
            <FieldLabel htmlFor="satusehat-import-parent">
              Organisasi induk lokal
            </FieldLabel>
            <SelectField
              id="satusehat-import-parent"
              value={parentId}
              onChange={setParentId}
              aria-label="Organisasi induk lokal untuk import"
            >
              <option value="">Tidak ada / root Organization</option>
              {parentOptions.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.code} - {organization.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <FieldLabel htmlFor="satusehat-import-name">
              Nama Organization
            </FieldLabel>
            <Input
              id="satusehat-import-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Kosongkan untuk semua anak parent"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={searching}
            aria-busy={searching}
          >
            {searching ? (
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Cari
          </Button>
        </form>
        {items.length > 0 ? (
          <div className="space-y-2">
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
          </div>
        ) : null}
        {selected ? (
          <div className="rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-3">
            <FieldLabel htmlFor="satusehat-import-code">Kode lokal</FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="satusehat-import-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={64}
                placeholder="Contoh: POLI-UMUM"
                className="sm:flex-1"
              />
              <Button
                type="button"
                onClick={() => void importSelected()}
                disabled={
                  !canWrite ||
                  importing ||
                  Boolean(selected.linkedLocalResourceId)
                }
                aria-busy={importing}
                className="w-full sm:w-auto"
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {importing ? "Mengimpor..." : "Impor ke lokal"}
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Nama dan kontak diambil dari SATUSEHAT; kode ini digunakan untuk
              referensi operasional lokal.
            </p>
          </div>
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

function defaultLocalCode(item: SatusehatOrganizationRemoteSummary): string {
  const source = item.identifiers[0]?.value || item.externalResourceId;
  const normalized = source.toUpperCase().replace(/[^A-Z0-9_-]+/g, "-");
  return `SAT-${normalized}`.slice(0, 64);
}
