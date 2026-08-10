'use client';

import { useState } from 'react';
import type {
  SatusehatPatientLookupIdentifier,
  SatusehatPatientLookupQuery,
  SatusehatPatientRemoteSummary,
  SatusehatPatientSearchResponse,
} from '@mitrafaskes/shared';
import { AlertTriangle, Download, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldLabel, SelectField } from '../master-faskes/FormField';

type PatientSatusehatLookupPanelProps = {
  nik: string;
  disabled: boolean;
  lookupSatusehat: (
    query: SatusehatPatientLookupQuery,
  ) => Promise<SatusehatPatientSearchResponse>;
  onNikChange: (value: string) => void;
  onApply: (remote: SatusehatPatientRemoteSummary) => void;
};

const NIK_SYSTEM = 'https://fhir.kemkes.go.id/id/nik';

export function PatientSatusehatLookupPanel({
  nik,
  disabled,
  lookupSatusehat,
  onNikChange,
  onApply,
}: PatientSatusehatLookupPanelProps) {
  const [identifierType, setIdentifierType] =
    useState<SatusehatPatientLookupIdentifier>('NIK');
  const [ihsNumber, setIhsNumber] = useState('');
  const [items, setItems] = useState<SatusehatPatientRemoteSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const identifier = identifierType === 'NIK' ? nik : ihsNumber;
  const identifierLabel = identifierType === 'NIK' ? 'NIK' : 'Nomor IHS';
  const identifierValid =
    identifierType === 'NIK'
      ? /^\d{16}$/.test(identifier)
      : /^[A-Za-z0-9.-]{1,64}$/.test(identifier);

  const changeIdentifierType = (value: string) => {
    setIdentifierType(value as SatusehatPatientLookupIdentifier);
    setItems([]);
    setMessage('');
    setAppliedId(null);
  };

  const changeIdentifier = (value: string) => {
    const normalized =
      identifierType === 'NIK'
        ? value.replace(/\D/g, '')
        : value.replace(/[^A-Za-z0-9.-]/g, '');
    if (identifierType === 'NIK') onNikChange(normalized);
    else setIhsNumber(normalized);
    setItems([]);
    setMessage('');
    setAppliedId(null);
  };

  const lookup = async () => {
    if (!identifierValid) return;

    setSearching(true);
    setMessage('');
    setAppliedId(null);
    try {
      const result = await lookupSatusehat({ identifierType, identifier });
      setItems(result.items);
      if (result.items.length === 0) {
        setMessage(
          'Data Patient tidak ditemukan di SATUSEHAT. Anda tetap dapat melengkapi form secara manual.',
        );
      }
    } catch (error) {
      setItems([]);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Data Patient SATUSEHAT tidak dapat ditarik.',
      );
    } finally {
      setSearching(false);
    }
  };

  const apply = (item: SatusehatPatientRemoteSummary) => {
    if (item.linkedLocalResourceId) return;
    onApply(item);
    setAppliedId(item.externalResourceId);
  };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Cari data SATUSEHAT <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Gunakan NIK atau Nomor IHS untuk mengisi data inti. Tidak menyimpan atau menghubungkan pasien.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <FieldLabel htmlFor="patient-satusehat-lookup-type">
            Cari berdasarkan
          </FieldLabel>
          <SelectField
            id="patient-satusehat-lookup-type"
            value={identifierType}
            onChange={changeIdentifierType}
            disabled={disabled || searching}
          >
            <option value="NIK">NIK</option>
            <option value="IHS">Nomor IHS</option>
          </SelectField>
        </div>
        <div>
          <FieldLabel htmlFor="patient-satusehat-lookup-identifier">
            {identifierLabel}
          </FieldLabel>
          <Input
            id="patient-satusehat-lookup-identifier"
            value={identifier}
            onChange={(event) => changeIdentifier(event.target.value)}
            inputMode={identifierType === 'NIK' ? 'numeric' : 'text'}
            maxLength={identifierType === 'NIK' ? 16 : 64}
            placeholder={identifierType === 'NIK' ? '16 digit NIK' : 'Contoh: P02478375538'}
            disabled={disabled || searching}
            aria-describedby="patient-satusehat-lookup-help"
          />
        </div>
        <Button
          type="button"
          onClick={() => void lookup()}
          disabled={disabled || searching || !identifierValid}
          aria-busy={searching}
        >
          {searching ? (
            <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          {searching ? 'Menarik...' : 'Tarik data'}
        </Button>
      </div>

      <p id="patient-satusehat-lookup-help" className="text-xs text-muted-foreground">
        {identifierType === 'NIK'
          ? 'Jika tidak ditemukan, lanjutkan isi form manual.'
          : 'Gunakan Nomor IHS pasien yang sudah ada.'}
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
            Pilih hasil untuk mengisi form.
          </p>
          {items.map((item) => (
            <PatientSatusehatLookupResult
              key={item.externalResourceId}
              item={item}
              applied={appliedId === item.externalResourceId}
              disabled={disabled || searching}
              onApply={() => apply(item)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PatientSatusehatLookupResult({
  item,
  applied,
  disabled,
  onApply,
}: {
  item: SatusehatPatientRemoteSummary;
  applied: boolean;
  disabled: boolean;
  onApply: () => void;
}) {
  const remoteNik = item.identifiers.find(
    (identifier) => identifier.system === NIK_SYSTEM,
  )?.value;
  const validNik = remoteNik && /^\d{16}$/.test(remoteNik) ? remoteNik : undefined;
  const linkedElsewhere = Boolean(item.linkedLocalResourceId);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
          <Badge
            className={
              item.active
                ? 'clinical-status-success border text-[10px]'
                : 'clinical-status-error border text-[10px]'
            }
          >
            {item.active ? 'AKTIF' : 'NONAKTIF'}
          </Badge>
          {linkedElsewhere ? (
            <Badge variant="outline" className="text-[10px]">
              Sudah terhubung
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Nomor IHS / SATUSEHAT ID:{' '}
            <strong className="font-mono font-medium text-foreground">
              {item.externalResourceId}
            </strong>
          </span>
          {validNik ? (
            <span>
              NIK: <strong className="font-mono font-medium text-foreground">{validNik}</strong>
            </span>
          ) : remoteNik ? (
            <span>NIK disamarkan oleh SATUSEHAT; isi NIK lokal bila diperlukan.</span>
          ) : null}
          {item.birthDate ? <span>Lahir: {item.birthDate}</span> : null}
          {item.gender ? <span>Gender: {item.gender}</span> : null}
        </div>
        {linkedElsewhere ? (
          <p className="flex items-start gap-1.5 pt-1 text-xs font-semibold text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Data ini sudah terhubung ke pasien lokal lain dan tidak dapat ditarik ke form baru.
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={applied ? 'secondary' : 'outline'}
        disabled={disabled || linkedElsewhere}
        onClick={onApply}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {applied ? 'Data sudah ditarik' : 'Tarik ke form'}
      </Button>
    </div>
  );
}
