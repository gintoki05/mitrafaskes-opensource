'use client';

import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { SelectField } from '../master-faskes/FormField';
import type { PatientFormValues } from './patient-form-schema';
import type { MaritalStatusLookupState } from './useMaritalStatuses';

type PatientMaritalStatusFieldProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  disabled: boolean;
  lookup: MaritalStatusLookupState;
};

export function PatientMaritalStatusField({
  control,
  errors,
  disabled,
  lookup,
}: PatientMaritalStatusFieldProps) {
  return (
    <Controller
      control={control}
      name="maritalStatusCode"
      render={({ field, fieldState }) => {
        const currentValue = field.value.trim();
        const hasCanonicalValue = lookup.statuses.some(
          (status) => status.code === currentValue,
        );
        const hasLegacyValue = Boolean(currentValue) && !hasCanonicalValue;
        const selectOptions = [
          ...(hasLegacyValue
            ? [
                <option key={`legacy-${currentValue}`} value={currentValue}>
                  {currentValue} — kode tersimpan (legacy)
                </option>,
              ]
            : []),
          ...lookup.statuses.map((status) => (
            <option key={status.code} value={status.code}>
              {status.code} — {status.display}
            </option>
          )),
        ];
        const lookupUnavailable = Boolean(lookup.error) || lookup.statuses.length === 0;
        const selectDisabled =
          disabled || lookup.loading || (lookupUnavailable && !currentValue);
        const hasLookupMessage =
          lookup.loading ||
          Boolean(lookup.error) ||
          lookup.statuses.length === 0 ||
          hasLegacyValue;
        const describedBy = [
          hasLookupMessage ? 'patient-marital-status-hint' : null,
          fieldState.error ? 'patient-marital-status-error' : null,
        ]
          .filter((id): id is string => Boolean(id))
          .join(' ') || undefined;
        const hint = lookup.loading
          ? 'Memuat lookup lokal...'
          : lookup.error
            ? `${lookup.error} Nilai lama tetap dipertahankan bila tersedia.`
            : lookup.statuses.length === 0
              ? 'Snapshot lokal belum memiliki pilihan Status Perkawinan.'
              : hasLegacyValue
                ? 'Kode lama dipertahankan; pilih nilai canonical bila ingin menggantinya.'
                : 'Pilihan dibaca dari database lokal.';

        return (
          <Field data-invalid={fieldState.invalid || Boolean(errors.maritalStatusCode)}>
            <FieldLabel htmlFor="patient-marital-status">Status perkawinan</FieldLabel>
            <SelectField
              id="patient-marital-status"
              value={currentValue}
              onChange={field.onChange}
              disabled={selectDisabled}
              aria-describedby={describedBy}
              aria-invalid={fieldState.invalid}
            >
              <option value="">Belum dipilih</option>
              {selectOptions}
            </SelectField>
            {hasLookupMessage ? (
              <FieldDescription
                id="patient-marital-status-hint"
                className={lookup.error ? 'text-destructive' : undefined}
                role={lookup.error ? 'alert' : 'status'}
              >
                {hint}
              </FieldDescription>
            ) : null}
            <FieldError
              id="patient-marital-status-error"
              errors={[fieldState.error]}
            />
          </Field>
        );
      }}
    />
  );
}
