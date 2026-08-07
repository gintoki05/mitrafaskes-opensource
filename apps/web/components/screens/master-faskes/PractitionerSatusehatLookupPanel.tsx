'use client';

import { useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import type {
  SatusehatPractitionerLookupIdentifier,
  SatusehatPractitionerRemoteSummary,
} from '@mitrafaskes/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePractitioners } from '@/hooks/usePractitioners';
import { FieldLabel, SelectField } from './FormField';

type PractitionerSatusehatLookupPanelProps = {
  nik: string;
  disabled: boolean;
  onNikChange: (value: string) => void;
  onApply: (remote: SatusehatPractitionerRemoteSummary) => void;
};

export function PractitionerSatusehatLookupPanel({
  nik,
  disabled,
  onNikChange,
  onApply,
}: PractitionerSatusehatLookupPanelProps) {
  const { lookupSatusehat } = usePractitioners();
  const [identifierType, setIdentifierType] =
    useState<SatusehatPractitionerLookupIdentifier>('NIK');
  const [ihsNumber, setIhsNumber] = useState('');
  const [items, setItems] = useState<SatusehatPractitionerRemoteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const identifier = identifierType === 'NIK' ? nik : ihsNumber;
  const identifierLabel = identifierType === 'NIK' ? 'NIK' : 'Nomor IHS';
  const identifierValid =
    identifierType === 'NIK'
      ? /^\d{16}$/.test(identifier)
      : /^\d{8,20}$/.test(identifier);

  const changeIdentifierType = (value: string) => {
    setIdentifierType(value as SatusehatPractitionerLookupIdentifier);
    setItems([]);
    setMessage('');
    setAppliedId(null);
  };

  const changeIdentifier = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (identifierType === 'NIK') onNikChange(digits);
    else setIhsNumber(digits);
    setItems([]);
    setMessage('');
    setAppliedId(null);
  };

  const lookup = async () => {
    if (!identifierValid) {
      setMessage(
        identifierType === 'NIK'
          ? 'Masukkan NIK 16 digit untuk menarik data.'
          : 'Masukkan Nomor IHS 8 sampai 20 digit untuk menarik data.',
      );
      return;
    }

    setSearching(true);
    setMessage('');
    setAppliedId(null);
    try {
      const result = await lookupSatusehat({
        identifierType,
        identifier,
      });
      setItems(result.items);
      if (result.items.length === 0) {
        setMessage('Data Practitioner tidak ditemukan di SATUSEHAT. Anda tetap dapat melengkapi form secara manual.');
      }
    } catch (error) {
      setItems([]);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Data Practitioner SATUSEHAT tidak dapat ditarik.',
      );
    } finally {
      setSearching(false);
    }
  };

  const apply = (item: SatusehatPractitionerRemoteSummary) => {
    onApply(item);
    setAppliedId(item.externalResourceId);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Tarik data dari SATUSEHAT
        </h3>
        <p className="text-xs text-muted-foreground">
          Cari dengan NIK atau Nomor IHS untuk mengisi identitas pada form. Aksi ini belum menyimpan atau menghubungkan data.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <FieldLabel htmlFor="practitioner-lookup-type">
            Cari berdasarkan
          </FieldLabel>
          <SelectField
            id="practitioner-lookup-type"
            value={identifierType}
            onChange={changeIdentifierType}
            disabled={disabled || searching}
          >
            <option value="NIK">NIK</option>
            <option value="IHS">Nomor IHS</option>
          </SelectField>
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-lookup-identifier">
            {identifierLabel}
          </FieldLabel>
          <Input
            id="practitioner-lookup-identifier"
            value={identifier}
            onChange={(event) => changeIdentifier(event.target.value)}
            inputMode="numeric"
            maxLength={identifierType === 'NIK' ? 16 : 20}
            placeholder={identifierType === 'NIK' ? '16 digit NIK' : 'Nomor IHS'}
            disabled={disabled || searching}
            aria-describedby="practitioner-lookup-help"
          />
        </div>
        <Button
          type="button"
          onClick={() => void lookup()}
          disabled={disabled || searching || !identifierValid}
          aria-busy={searching}
        >
          {searching ? (
            <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? 'Menarik...' : 'Tarik data'}
        </Button>
      </div>
      <p id="practitioner-lookup-help" className="text-xs text-muted-foreground">
        {identifierType === 'NIK'
          ? 'NIK lokal dapat tetap digunakan meski hasil SATUSEHAT tidak ditemukan.'
          : 'Nomor IHS dipakai untuk mengambil data Practitioner yang sudah dikenal SATUSEHAT.'}
      </p>
      {message ? (
        <p
          className="rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {items.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-4" aria-live="polite">
          <p className="text-xs font-medium text-foreground">
            Pilih data yang ingin dimasukkan ke form.
          </p>
          {items.map((item) => (
            <PractitionerSatusehatLookupResult
              key={item.externalResourceId}
              item={item}
              applied={appliedId === item.externalResourceId}
              disabled={disabled || searching}
              onApply={() => apply(item)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PractitionerSatusehatLookupResult({
  item,
  applied,
  disabled,
  onApply,
}: {
  item: SatusehatPractitionerRemoteSummary;
  applied: boolean;
  disabled: boolean;
  onApply: () => void;
}) {
  const nik = item.identifiers.find(
    (identifier) => identifier.system === 'https://fhir.kemkes.go.id/id/nik',
  )?.value;
  const validNik = nik && /^\d{16}$/.test(nik) ? nik : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Nomor IHS: <strong className="font-mono font-medium text-foreground">{item.externalResourceId}</strong>
          </span>
          {validNik ? (
            <span>
              NIK: <strong className="font-mono font-medium text-foreground">{validNik}</strong>
            </span>
          ) : nik ? (
            <span>NIK disamarkan oleh SATUSEHAT; isi NIK lokal bila diperlukan.</span>
          ) : null}
          {item.birthDate ? <span>Lahir: {item.birthDate}</span> : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={applied ? 'secondary' : 'outline'}
        disabled={disabled}
        onClick={onApply}
      >
        <Download className="h-3.5 w-3.5" />
        {applied ? 'Data sudah ditarik' : 'Tarik ke form'}
      </Button>
    </div>
  );
}
