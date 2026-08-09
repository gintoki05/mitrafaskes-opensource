import { Input } from '@/components/ui/input';
import type {
  PractitionerFormFieldUpdater,
  PractitionerFormState,
} from './practitionerCreateTypes';
import { FieldLabel, SelectField } from './FormField';

export function PractitionerCreateIdentityFields({
  form,
  disabled,
  updateField,
}: {
  form: PractitionerFormState;
  disabled: boolean;
  updateField: PractitionerFormFieldUpdater;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground">Identitas & akun</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Username dan password awal digunakan sebagai akun User lokal.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="practitioner-create-full-name" required>
            Nama lengkap
          </FieldLabel>
          <Input
            id="practitioner-create-full-name"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder="dr. Alexander"
            disabled={disabled}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-role" required>
            Role
          </FieldLabel>
          <SelectField
            id="practitioner-create-role"
            value={form.role}
            onChange={(value) =>
              updateField('role', value as PractitionerFormState['role'])
            }
            disabled={disabled}
          >
            <option value="DOKTER">Dokter</option>
            <option value="PERAWAT">Perawat</option>
          </SelectField>
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-username" required>
            Username
          </FieldLabel>
          <Input
            id="practitioner-create-username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="dr_alexander"
            autoComplete="username"
            disabled={disabled}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="practitioner-create-password" required>
            Password awal
          </FieldLabel>
          <Input
            id="practitioner-create-password"
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            disabled={disabled}
            required
          />
        </div>
      </div>
    </section>
  );
}
