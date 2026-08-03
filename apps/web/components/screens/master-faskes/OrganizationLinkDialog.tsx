'use client';

import { type SubmitEvent, useEffect, useState } from 'react';
import { Link2, RefreshCw, Search } from 'lucide-react';
import type {
  OrganizationSummary,
  SatusehatOrganizationRemoteSummary,
} from '@mitrafaskes/shared';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSatusehatOrganizations } from '@/hooks/useSatusehatOrganizations';
import { FieldLabel } from './FormField';
import { MasterFaskesDialog } from './MasterFaskesDialog';
import { SatusehatOrganizationResult } from './SatusehatOrganizationResult';
import { toast } from 'sonner';

type OrganizationLinkDialogProps = {
  open: boolean;
  organization: OrganizationSummary | null;
  canWrite: boolean;
  onClose: () => void;
  onLinked: () => void | Promise<void>;
};

export function OrganizationLinkDialog({
  open,
  organization,
  canWrite,
  onClose,
  onLinked,
}: OrganizationLinkDialogProps) {
  if (!open || !organization) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Hubungkan ${organization.name} dengan SATUSEHAT`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <OrganizationLinkDialogContent
        key={organization.id}
        organization={organization}
        canWrite={canWrite}
        onClose={onClose}
        onLinked={onLinked}
      />
    </MasterFaskesDialog>
  );
}

function OrganizationLinkDialogContent({
  organization,
  canWrite,
  onClose,
  onLinked,
}: Omit<OrganizationLinkDialogProps, 'open' | 'organization'> & {
  organization: OrganizationSummary;
}) {
  const { search, linkExisting } = useSatusehatOrganizations();
  const [name, setName] = useState(organization.name);
  const [externalId, setExternalId] = useState('');
  const [items, setItems] = useState<SatusehatOrganizationRemoteSummary[]>([]);
  const [selected, setSelected] =
    useState<SatusehatOrganizationRemoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void search({ name: organization.name })
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
          toast.error('Pencarian SATUSEHAT gagal', {
            description:
              requestError instanceof Error
                ? requestError.message
                : 'Data organisasi SATUSEHAT tidak dapat dicari.',
            duration: 7000,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organization.id, organization.name, search]);

  const runSearch = async (event?: SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const queryId = externalId.trim();
    const queryName = name.trim();
    if (!queryId && !queryName) {
      toast.error('Pencarian belum berhasil', {
        description: 'Isi nama atau ID SATUSEHAT untuk mencari data.',
      });
      return;
    }

    setSearching(true);
    setSelected(null);
    try {
      const result = await search({
        id: queryId || undefined,
        name: queryId ? undefined : queryName,
      });
      setItems(result.items);
      if (result.items.length === 0) {
        toast.info('Data organisasi tidak ditemukan', {
          description: 'Coba gunakan nama yang lebih spesifik atau ID SATUSEHAT.',
        });
      }
    } catch (requestError) {
      setItems([]);
      toast.error('Pencarian SATUSEHAT gagal', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Data organisasi SATUSEHAT tidak dapat dicari.',
        duration: 7000,
      });
    } finally {
      setSearching(false);
    }
  };

  const link = async () => {
    if (!selected) return;
    setLinking(true);
    try {
      await linkExisting(organization.id, {
        externalResourceId: selected.externalResourceId,
      });
      setItems((current) =>
        current.map((item) =>
          item.externalResourceId === selected.externalResourceId
            ? { ...item, linkedLocalResourceId: organization.id }
            : item,
        ),
      );
      setSelected((current) =>
        current
          ? { ...current, linkedLocalResourceId: organization.id }
          : current,
      );
      toast.success('Data lokal berhasil dihubungkan dengan SATUSEHAT.');
      await onLinked();
    } catch (requestError) {
      toast.error('Data organisasi belum terhubung', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Data organisasi SATUSEHAT tidak dapat dihubungkan.',
        duration: 7000,
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Hubungkan data yang sudah ada
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Gunakan ini jika data sudah ada di Master Faskes dan juga sudah
          terdaftar di SATUSEHAT. Sistem hanya membuat hubungan, bukan data
          baru.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void runSearch(event)}>
          <div>
            <FieldLabel htmlFor="satusehat-link-name">
              Nama organisasi / faskes
            </FieldLabel>
            <Input
              id="satusehat-link-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Klinik Mitra Sehat"
            />
          </div>
          <div>
            <FieldLabel htmlFor="satusehat-link-id">ID SATUSEHAT (opsional)</FieldLabel>
            <Input
              id="satusehat-link-id"
              value={externalId}
              onChange={(event) => setExternalId(event.target.value)}
              placeholder="Gunakan jika ID sudah diketahui"
            />
          </div>
          <Button type="submit" className="self-end" disabled={searching} aria-busy={searching}>
            {searching ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" /> : <Search className="h-4 w-4" />}
            Cari
          </Button>
        </form>
        {loading ? (
          <ScreenState
            kind="loading"
            title="Mencari data organisasi SATUSEHAT"
            description="Data yang cocok sedang diambil."
            compact
          />
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <SatusehatOrganizationResult
                key={item.externalResourceId}
                item={item}
                selected={selected?.externalResourceId === item.externalResourceId}
                currentLocalResourceId={organization.id}
                onSelect={() => setSelected(item)}
              />
            ))}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {canWrite ? (
            <Button
              type="button"
              onClick={() => void link()}
              disabled={!selected || linking || Boolean(selected?.linkedLocalResourceId)}
              aria-busy={linking}
            >
              {linking ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" /> : <Link2 className="h-4 w-4" />}
              {linking ? 'Menghubungkan...' : 'Hubungkan data ini'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
