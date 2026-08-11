import type { SatusehatPractitionerRemoteSummary } from '@mitrafaskes/shared';
import { Input } from '@/components/ui/input';
import type {
  PractitionerFormFieldUpdater,
  PractitionerFormState,
} from './practitionerCreateTypes';
import { FieldLabel, SelectField } from './FormField';
import { PractitionerSatusehatLookupPanel } from './PractitionerSatusehatLookupPanel';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

export function PractitionerCreateClinicalFields({
  form,
  disabled,
  updateField,
  onApply,
}: {
  form: PractitionerFormState;
  disabled: boolean;
  updateField: PractitionerFormFieldUpdater;
  onApply: (remote: SatusehatPractitionerRemoteSummary) => void;
}) {
  const satusehat = useIntegrationCapability('SATUSEHAT');
  return (
    <section className="space-y-4 border-t border-border pt-5">
      <div>
        <h2 className="text-sm font-bold text-foreground">Data Practitioner</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Lengkapi data lokal secara manual
            {satusehat.configured ? ', atau tarik identitas bila tersedia di SATUSEHAT.' : '.'}
        </p>
      </div>
      {satusehat.configured ? (
        <PractitionerSatusehatLookupPanel
          nik={form.nik ?? ''}
          disabled={disabled}
          onNikChange={(value) => updateField('nik', value)}
          onApply={onApply}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {satusehat.available ? (
          <div>
            <FieldLabel htmlFor="practitioner-create-satusehat-id">
              ID SATUSEHAT
            </FieldLabel>
            <Input
              id="practitioner-create-satusehat-id"
              value={form.satusehatId}
              readOnly
              className="font-mono"
              placeholder="Diisi dari hasil lookup"
              disabled={disabled}
            />
          </div>
        ) : null}
        <div>
          <FieldLabel htmlFor="practitioner-create-birth-date">
            Tanggal lahir
          </FieldLabel>
          <Input
            id="practitioner-create-birth-date"
            type="date"
            value={form.birthDate ?? ''}
            onChange={(event) => updateField('birthDate', event.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-gender">
            Jenis kelamin
          </FieldLabel>
          <SelectField
            id="practitioner-create-gender"
            value={form.gender ?? ''}
            onChange={(value) =>
              updateField(
                'gender',
                value ? (value as 'MALE' | 'FEMALE') : null,
              )
            }
            disabled={disabled}
          >
            <option value="">Belum diisi</option>
            <option value="MALE">Laki-laki</option>
            <option value="FEMALE">Perempuan</option>
          </SelectField>
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-active">Status</FieldLabel>
          <SelectField
            id="practitioner-create-active"
            value={form.active}
            onChange={(value) => updateField('active', value)}
            disabled={disabled}
          >
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </SelectField>
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-sip">Nomor SIP</FieldLabel>
          <Input
            id="practitioner-create-sip"
            value={form.sipNumber ?? ''}
            onChange={(event) => updateField('sipNumber', event.target.value)}
            placeholder="Opsional"
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-str">Nomor STR</FieldLabel>
          <Input
            id="practitioner-create-str"
            value={form.strNumber ?? ''}
            onChange={(event) => updateField('strNumber', event.target.value)}
            placeholder="Opsional"
            disabled={disabled}
          />
        </div>
      </div>
    </section>
  );
}
