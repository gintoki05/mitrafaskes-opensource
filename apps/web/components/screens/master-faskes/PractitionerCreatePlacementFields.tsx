import type {
  LocationSummary,
  OrganizationSummary,
} from '@mitrafaskes/shared';
import type {
  PractitionerFormFieldUpdater,
  PractitionerFormState,
} from './practitionerCreateTypes';
import { FieldLabel, SelectField } from './FormField';

export function PractitionerCreatePlacementFields({
  form,
  disabled,
  organizations,
  locations,
  updateField,
}: {
  form: PractitionerFormState;
  disabled: boolean;
  organizations: OrganizationSummary[];
  locations: LocationSummary[];
  updateField: PractitionerFormFieldUpdater;
}) {
  const availableLocations = form.organizationId
    ? locations.filter((location) => location.organizationId === form.organizationId)
    : [];

  return (
    <section className="space-y-4 border-t border-border pt-5">
      <div>
        <h2 className="text-sm font-bold text-foreground">
          Referensi penempatan
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hubungkan Practitioner ke data Organization dan Location lokal. Keduanya
          tidak wajib untuk menyimpan profil lokal.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="practitioner-create-organization">
            Organization
          </FieldLabel>
          <SelectField
            id="practitioner-create-organization"
            value={form.organizationId ?? ''}
            onChange={(value) => {
              updateField('organizationId', value || null);
              updateField('locationId', null);
            }}
            disabled={disabled}
          >
            <option value="">Belum ditetapkan</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.code} - {organization.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-location">
            Location
          </FieldLabel>
          <SelectField
            id="practitioner-create-location"
            value={form.locationId ?? ''}
            onChange={(value) => updateField('locationId', value || null)}
            disabled={disabled || !form.organizationId}
          >
            <option value="">
              {form.organizationId ? 'Belum ditetapkan' : 'Pilih Organization dulu'}
            </option>
            {availableLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} - {location.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </section>
  );
}
