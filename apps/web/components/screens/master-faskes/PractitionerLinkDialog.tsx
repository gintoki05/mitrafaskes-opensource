'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link2, RefreshCw, Search, UserRound } from 'lucide-react';
import type {
  PractitionerSummary,
  SatusehatPractitionerLookupIdentifier,
  SatusehatPractitionerRemoteSummary,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePractitioners } from '@/hooks/usePractitioners';
import { FieldLabel, SelectField } from './FormField';
import { MasterFaskesDialog } from './MasterFaskesDialog';
import { SatusehatPractitionerResult } from './SatusehatPractitionerResult';

type PractitionerLinkDialogProps = {
  open: boolean;
  practitioner: PractitionerSummary | null;
  canWrite: boolean;
  onClose: () => void;
  onLinked: () => void | Promise<void>;
};

export function PractitionerLinkDialog({
  open,
  practitioner,
  canWrite,
  onClose,
  onLinked,
}: PractitionerLinkDialogProps) {
  if (!open || !practitioner) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Hubungkan ${practitioner.fullName} dengan SATUSEHAT`}
      onClose={onClose}
      className="max-w-3xl"
    >
      <PractitionerLinkDialogContent
        key={practitioner.id}
        practitioner={practitioner}
        canWrite={canWrite}
        onClose={onClose}
        onLinked={onLinked}
      />
    </MasterFaskesDialog>
  );
}

function PractitionerLinkDialogContent({
  practitioner,
  canWrite,
  onClose,
  onLinked,
}: Omit<PractitionerLinkDialogProps, 'open' | 'practitioner'> & {
  practitioner: PractitionerSummary;
}) {
  const { lookupSatusehat, linkExisting } = usePractitioners();
  const [items, setItems] = useState<SatusehatPractitionerRemoteSummary[]>([]);
  const [selected, setSelected] = useState<SatusehatPractitionerRemoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(true);
  const [linking, setLinking] = useState(false);
  const [identifierType, setIdentifierType] =
    useState<SatusehatPractitionerLookupIdentifier>('NIK');
  const [ihsNumber, setIhsNumber] = useState('');
  const identifier = identifierType === 'NIK' ? practitioner.nik ?? '' : ihsNumber;
  const identifierLabel = identifierType === 'NIK' ? 'NIK lokal' : 'Nomor IHS';
  const identifierValid =
    identifierType === 'NIK'
      ? /^\d{16}$/.test(identifier)
      : /^\d{8,20}$/.test(identifier);

  const performSearch = useCallback(
    async (query: {
      identifierType: SatusehatPractitionerLookupIdentifier;
      identifier: string;
    }) => {
      setSearching(true);
      setLoading(true);
      try {
        const result = await lookupSatusehat(query);
        setItems(result.items);
        if (result.items.length === 0) {
          toast.info('Practitioner SATUSEHAT tidak ditemukan', {
            description:
              query.identifierType === 'NIK'
                ? 'Pastikan NIK lokal sesuai dengan data Master Nakes Index.'
                : 'Pastikan Nomor IHS sesuai dengan resource Practitioner SATUSEHAT.',
          });
        }
      } catch (requestError) {
        setItems([]);
        toast.error('Pencarian Practitioner gagal', {
          description:
            requestError instanceof Error
              ? requestError.message
              : 'Data Practitioner SATUSEHAT tidak dapat dicari.',
          duration: 7000,
        });
      } finally {
        setSearching(false);
        setLoading(false);
      }
    },
    [lookupSatusehat],
  );

  const runSearch = useCallback(() => {
    setSelected(null);
    if (!identifierValid) return;
    void performSearch({ identifierType, identifier });
  }, [identifier, identifierType, identifierValid, performSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (practitioner.nik) {
        void performSearch({ identifierType: 'NIK', identifier: practitioner.nik });
      } else {
        setSearching(false);
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [performSearch, practitioner.nik]);

  const link = async () => {
    if (!selected || !canWrite) return;
    setLinking(true);
    try {
      await linkExisting(practitioner.id, {
        externalResourceId: selected.externalResourceId,
      });
      toast.success('Practitioner berhasil dihubungkan dengan SATUSEHAT.');
      await onLinked();
      onClose();
    } catch (requestError) {
      toast.error('Practitioner belum terhubung', {
        description:
          requestError instanceof Error
            ? requestError.message
            : 'Practitioner SATUSEHAT tidak dapat dihubungkan.',
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
          <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
          Hubungkan Practitioner yang sudah ada
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pilih NIK lokal atau Nomor IHS untuk mencari resource yang sudah
          tersedia di SATUSEHAT. Sistem tidak membuat Practitioner baru.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 rounded-[var(--radius-control)] border border-border bg-muted/40 p-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <FieldLabel htmlFor="practitioner-link-lookup-type">
              Cari berdasarkan
            </FieldLabel>
            <SelectField
              id="practitioner-link-lookup-type"
              value={identifierType}
              onChange={(value) => {
                setIdentifierType(value as SatusehatPractitionerLookupIdentifier);
                setItems([]);
                setSelected(null);
              }}
              disabled={searching}
            >
              <option value="NIK">NIK</option>
              <option value="IHS">Nomor IHS</option>
            </SelectField>
          </div>
          <div>
            <FieldLabel htmlFor="practitioner-link-lookup-identifier">
              {identifierLabel}
            </FieldLabel>
            <Input
              id="practitioner-link-lookup-identifier"
              value={identifier}
              onChange={(event) => setIhsNumber(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={identifierType === 'NIK' ? 16 : 20}
              placeholder={identifierType === 'NIK' ? 'NIK lokal' : 'Nomor IHS'}
              readOnly={identifierType === 'NIK'}
              disabled={searching}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void runSearch()}
            disabled={searching || !identifierValid}
            aria-busy={searching}
          >
            {searching ? (
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searching ? 'Mencari...' : 'Cari ulang'}
          </Button>
        </div>
        {loading ? (
          <ScreenState
            kind="loading"
            title="Mencari Practitioner SATUSEHAT"
            description="Data tenaga kesehatan yang cocok sedang diambil."
            compact
          />
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <SatusehatPractitionerResult
                key={item.externalResourceId}
                item={item}
                selected={selected?.externalResourceId === item.externalResourceId}
                currentLocalResourceId={practitioner.id}
                onSelect={() => setSelected(item)}
              />
            ))}
          </div>
        ) : (
          <ScreenState
            kind="empty"
            title="Belum ada kandidat Practitioner"
            description="Periksa NIK lokal atau konfigurasi koneksi SATUSEHAT."
            compact
          />
        )}
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
