'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Field, FieldLabel } from '@/components/ui/field';
import { SelectField } from '../master-faskes/FormField';
import type { PatientFormValues } from './patient-form-schema';

export function PatientStatusField({
  control,
  disabled,
}: {
  control: Control<PatientFormValues>;
  disabled: boolean;
}) {
  return (
    <Controller
      control={control}
      name="active"
      render={({ field }) => (
        <Field className="min-w-36 sm:w-40">
          <FieldLabel htmlFor="patient-active">Status pasien</FieldLabel>
          <SelectField
            id="patient-active"
            value={field.value ? 'true' : 'false'}
            onChange={(value) => field.onChange(value === 'true')}
            disabled={disabled}
          >
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </SelectField>
        </Field>
      )}
    />
  );
}
