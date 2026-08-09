'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import type { RegionSummary } from '@mitrafaskes/shared';
import { Button } from '@/components/ui/button';
import { ComboboxField } from '@/components/ui/combobox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import type { PatientFormValues } from './patient-form-schema';
import type { PatientWilayahLookupState } from './usePatientWilayahLookup';

type RegionCodeField =
  | 'provinceCode'
  | 'regencyCode'
  | 'districtCode'
  | 'villageCode';
type RegionNameField =
  | 'provinceName'
  | 'regencyName'
  | 'districtName'
  | 'villageName';

type PatientRegionFieldsProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  setValue: UseFormSetValue<PatientFormValues>;
  disabled: boolean;
  lookup: PatientWilayahLookupState;
};

type RegionSelectControllerProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  codeField: RegionCodeField;
  label: string;
  id: string;
  currentName: string;
  lookup: PatientWilayahLookupState['province'];
  parentReady: boolean;
  disabled: boolean;
  onSelect: (region: RegionSummary | undefined) => void;
};

const regionOptions = (items: readonly RegionSummary[]) =>
  items.map((region) => ({
    value: region.code,
    label: `${region.name} (${region.code})`,
  }));

const comparableName = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');

function RegionSelectController({
  control,
  errors,
  codeField,
  label,
  id,
  currentName,
  lookup,
  parentReady,
  disabled,
  onSelect,
}: RegionSelectControllerProps) {
  const options = regionOptions(lookup.items);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={codeField}
      render={({ field, fieldState }) => {
        const selected = lookup.items.find(
          (region) => region.code === field.value,
        );
        const isCanonical = Boolean(
          selected &&
            (!currentName ||
              comparableName(currentName) === comparableName(selected.name)),
        );
        const hasLegacyValue = Boolean(field.value || currentName) && !isCanonical;
        const isDisabled =
          disabled ||
          !parentReady ||
          lookup.loading ||
          Boolean(lookup.error) ||
          lookup.items.length === 0;
        const hint = lookup.loading
          ? 'Memuat pilihan dari Master Wilayah lokal...'
          : lookup.error
            ? lookup.error
            : !parentReady
              ? 'Pilih wilayah di atas terlebih dahulu.'
              : lookup.items.length === 0
                ? 'Tidak ada pilihan wilayah untuk parent ini.'
                : hasLegacyValue
                  ? 'Nilai legacy dipertahankan. Pilih nilai canonical untuk menggantinya.'
                  : 'Pilihan dibaca dari Master Wilayah lokal.';
        const describedBy = [hintId, fieldState.error ? errorId : null]
          .filter((value): value is string => Boolean(value))
          .join(' ');

        return (
          <Field data-invalid={fieldState.invalid || Boolean(errors[codeField])}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {hasLegacyValue ? (
              <p className="rounded-md border border-dashed border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
                Nilai tersimpan: {currentName || field.value}
                {currentName && field.value ? ` (${field.value})` : ''} · legacy
              </p>
            ) : null}
            <ComboboxField
              id={id}
              value={isCanonical ? field.value : ''}
              options={options}
              onChange={(value) => {
                const region = lookup.items.find((item) => item.code === value);
                field.onChange(region?.code ?? '');
                onSelect(region);
              }}
              disabled={isDisabled}
              placeholder={`Pilih ${label.toLowerCase()}`}
              emptyMessage={`Tidak ada ${label.toLowerCase()} yang cocok.`}
              aria-describedby={describedBy}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription
              id={hintId}
              className={lookup.error ? 'text-destructive' : undefined}
              role={lookup.error ? 'alert' : 'status'}
            >
              {hint}
            </FieldDescription>
            <FieldError
              id={errorId}
              errors={[fieldState.error, errors[codeField]]}
            />
          </Field>
        );
      }}
    />
  );
}

export function PatientRegionFields({
  control,
  errors,
  register,
  setValue,
  disabled,
  lookup,
}: PatientRegionFieldsProps) {
  const values = useWatch({ control });
  const hasLookupError = Boolean(
    lookup.province.error ||
      lookup.regency.error ||
      lookup.district.error ||
      lookup.village.error,
  );

  const setRegionValue = (
    field: RegionNameField | RegionCodeField,
    value: string,
  ) => {
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
  };

  const clearRegion = (codeField: RegionCodeField, nameField: RegionNameField) => {
    setRegionValue(codeField, '');
    setRegionValue(nameField, '');
  };

  const selectProvince = (region: RegionSummary | undefined) => {
    setRegionValue('provinceName', region?.name ?? '');
    clearRegion('regencyCode', 'regencyName');
    clearRegion('districtCode', 'districtName');
    clearRegion('villageCode', 'villageName');
  };

  const selectRegency = (region: RegionSummary | undefined) => {
    setRegionValue('regencyName', region?.name ?? '');
    clearRegion('districtCode', 'districtName');
    clearRegion('villageCode', 'villageName');
  };

  const selectDistrict = (region: RegionSummary | undefined) => {
    setRegionValue('districtName', region?.name ?? '');
    clearRegion('villageCode', 'villageName');
  };

  const selectVillage = (region: RegionSummary | undefined) => {
    setRegionValue('villageName', region?.name ?? '');
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Pilih wilayah administratif dari Master Wilayah. Memilih parent akan
          memuat pilihan child yang sesuai.
        </p>
        {hasLookupError ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void lookup.refresh()}
          >
            Coba lagi
          </Button>
        ) : null}
      </div>

      <input type="hidden" {...register('provinceName')} />
      <input type="hidden" {...register('regencyName')} />
      <input type="hidden" {...register('districtName')} />
      <input type="hidden" {...register('villageName')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <RegionSelectController
          control={control}
          errors={errors}
          codeField="provinceCode"
          label="Provinsi"
          id="patient-province"
          currentName={values.provinceName ?? ''}
          lookup={lookup.province}
          parentReady
          disabled={disabled}
          onSelect={selectProvince}
        />
        <RegionSelectController
          control={control}
          errors={errors}
          codeField="regencyCode"
          label="Kabupaten/kota"
          id="patient-regency"
          currentName={values.regencyName ?? ''}
          lookup={lookup.regency}
          parentReady={Boolean(values.provinceCode)}
          disabled={disabled}
          onSelect={selectRegency}
        />
        <RegionSelectController
          control={control}
          errors={errors}
          codeField="districtCode"
          label="Kecamatan"
          id="patient-district"
          currentName={values.districtName ?? ''}
          lookup={lookup.district}
          parentReady={Boolean(values.regencyCode)}
          disabled={disabled}
          onSelect={selectDistrict}
        />
        <RegionSelectController
          control={control}
          errors={errors}
          codeField="villageCode"
          label="Desa/kelurahan"
          id="patient-village"
          currentName={values.villageName ?? ''}
          lookup={lookup.village}
          parentReady={Boolean(values.districtCode)}
          disabled={disabled}
          onSelect={selectVillage}
        />
      </div>
    </div>
  );
}
