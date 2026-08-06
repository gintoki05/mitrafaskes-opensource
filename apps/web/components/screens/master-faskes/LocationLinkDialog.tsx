'use client';

import { type SubmitEvent, useEffect, useState } from 'react';
import { Link2, RefreshCw, Search } from 'lucide-react';
import type {
  LocationSummary,
  SatusehatLocationRemoteSummary,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSatusehatLocations } from '@/hooks/useSatusehatLocations';
import { FieldLabel } from './FormField';
import { MasterFaskesDialog } from './MasterFaskesDialog';
import { SatusehatLocationResult } from './SatusehatLocationResult';

type LocationLinkDialogProps = {
  open: boolean;
  location: LocationSummary | null;
  canWrite: boolean;
  onClose: () => void;
  onLinked: () => void | Promise<void>;
};

export function LocationLinkDialog({
  open,
  location,
  canWrite,
  onClose,
  onLinked,
}: LocationLinkDialogProps) {
  if (!open || !location) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Hubungkan ${location.name} dengan SATUSEHAT`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <LocationLinkDialogContent
        key={location.id}
        location={location}
        canWrite={canWrite}
        onClose={onClose}
        onLinked={onLinked}
      />
    </MasterFaskesDialog>
  );
}

function LocationLinkDialogContent({
  location,
  canWrite,
  onClose,
  onLinked,
}: Omit<LocationLinkDialogProps, 'open' | 'location'> & {
  location: LocationSummary;
}) {
  const { search, linkExisting } = useSatusehatLocations();
  const [name, setName] = useState(location.name);
  const [identifier, setIdentifier] = useState(location.code);
  const [externalId, setExternalId] = useState('');
  const [items, setItems] = useState<SatusehatLocationRemoteSummary[]>([]);
  const [selected, setSelected] =
    useState<SatusehatLocationRemoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void search({
      name: location.name,
      organizationLocalId: location.organizationId,
    })
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
                : 'Data Location SATUSEHAT tidak dapat dicari.',
            duration: 7000,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.name, location.organizationId, search]);

  const runSearch = async (event?: SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const queryId = externalId.trim();
    const queryIdentifier = identifier.trim();
    const queryName = name.trim();
    if (!queryId && !queryIdentifier && !queryName) {
      toast.error('Pencarian belum berhasil', {
        description: 'Isi nama, kode, atau ID SATUSEHAT Location.',
      });
      return;
    }

    setSearching(true);
    setSelected(null);
    try {
      const result = await search({
        id: queryId || undefined,
        identifier: queryId ? undefined : queryIdentifier || undefined,
        name: queryId ? undefined : queryName || undefined,
        organizationLocalId: location.organizationId,
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

  const link = async () => {
    if (!selected || !canWrite) return;
    setLinking(true);
    try {
      await linkExisting(location.id, {
        externalResourceId: selected.externalResourceId,
      });
      toast.success('Location lokal berhasil dihubungkan dengan SATUSEHAT.');
      await onLinked();
      onClose();
    } catch (requestError) {
      toast.error('Location belum terhubung', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Location SATUSEHAT tidak dapat dihubungkan.',
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
          Hubungkan Location yang sudah ada
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Gunakan ini jika Location sudah ada di Master Faskes dan SATUSEHAT.
          Sistem hanya membuat hubungan, bukan data baru.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          onSubmit={(event) => void runSearch(event)}
        >
          <div>
            <FieldLabel htmlFor="satusehat-location-link-name">Nama</FieldLabel>
            <Input
              id="satusehat-location-link-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama Location"
            />
          </div>
          <div>
            <FieldLabel htmlFor="satusehat-location-link-identifier">
              Kode Location
            </FieldLabel>
            <Input
              id="satusehat-location-link-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Kode internal"
            />
          </div>
          <div>
            <FieldLabel htmlFor="satusehat-location-link-id">
              ID SATUSEHAT
            </FieldLabel>
            <Input
              id="satusehat-location-link-id"
              value={externalId}
              onChange={(event) => setExternalId(event.target.value)}
              placeholder="UUID Location"
            />
          </div>
          <Button
            type="submit"
            className="self-end"
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
        {loading ? (
          <ScreenState
            kind="loading"
            title="Mencari Location SATUSEHAT"
            description="Data yang cocok sedang diambil."
            compact
          />
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <SatusehatLocationResult
                key={item.externalResourceId}
                item={item}
                selected={selected?.externalResourceId === item.externalResourceId}
                currentLocalResourceId={location.id}
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
              disabled={!selected || linking}
              aria-busy={linking}
            >
              {linking ? (
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {linking ? 'Menghubungkan...' : 'Hubungkan data ini'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
