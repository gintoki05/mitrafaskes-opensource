"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  Controller,
  type Control,
  type FieldArrayWithId,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/screens/master-faskes/FormField";
import type { RmeFormValues } from "./rme-form-schema";

type HistoryField = FieldArrayWithId<RmeFormValues, "histories", "id">;

type HistoryError = {
  category?: { message?: string };
  text?: { message?: string };
};

type RmeHistorySectionProps = {
  fields: HistoryField[];
  control: Control<RmeFormValues>;
  register: UseFormRegister<RmeFormValues>;
  errors?: Array<HistoryError | undefined>;
  disabled: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export function RmeHistorySection({
  fields,
  control,
  register,
  errors,
  disabled,
  onAdd,
  onRemove,
}: RmeHistorySectionProps) {
  return (
    <Card data-rme-section="anamnesis" tabIndex={-1}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-sm font-bold text-foreground">
            Riwayat klinis terstruktur
          </CardTitle>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Catat riwayat penyakit, keluarga, obat aktif, atau faktor risiko
            bila diketahui.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah riwayat
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((field, index) => {
          const error = errors?.[index];
          return (
            <div
              key={field.id}
              className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3 md:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.7fr)_8rem_auto] md:items-start"
            >
              <Field>
                <FieldLabel htmlFor={`history-category-${index}`}>
                  Kategori
                </FieldLabel>
                <Controller
                  control={control}
                  name={`histories.${index}.category`}
                  render={({ field: categoryField }) => (
                    <SelectField
                      id={`history-category-${index}`}
                      value={categoryField.value}
                      disabled={disabled}
                      onChange={categoryField.onChange}
                      aria-label={`Kategori riwayat ${index + 1}`}
                    >
                      <option value="PAST_MEDICAL">
                        Riwayat penyakit dahulu
                      </option>
                      <option value="FAMILY">Riwayat keluarga</option>
                      <option value="MEDICATION">Riwayat obat</option>
                      <option value="RISK">Faktor risiko/kebiasaan</option>
                    </SelectField>
                  )}
                />
                {error?.category?.message ? (
                  <p className="text-xs text-destructive" role="alert">
                    {error.category.message}
                  </p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor={`history-text-${index}`}>
                  Catatan riwayat
                </FieldLabel>
                <textarea
                  {...register(`histories.${index}.text`)}
                  id={`history-text-${index}`}
                  rows={2}
                  className="clinical-field w-full p-3 text-xs"
                  placeholder="Kondisi, obat, kebiasaan, atau riwayat terkait"
                  disabled={disabled}
                />
                {error?.text?.message ? (
                  <p className="text-xs text-destructive" role="alert">
                    {error.text.message}
                  </p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor={`history-onset-${index}`}>
                  Mulai diketahui
                </FieldLabel>
                <Input
                  {...register(`histories.${index}.onset`)}
                  id={`history-onset-${index}`}
                  type="date"
                  disabled={disabled}
                  className="text-xs"
                />
              </Field>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(index)}
                disabled={disabled}
                aria-label={`Hapus riwayat ${index + 1}`}
                title="Hapus riwayat"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>

              <div className="grid gap-3 border-t border-border pt-3 md:col-span-4 md:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.7fr)]">
                <Field>
                  <FieldLabel htmlFor={`history-status-${index}`}>
                    Status riwayat
                  </FieldLabel>
                  <Controller
                    control={control}
                    name={`histories.${index}.status`}
                    render={({ field: statusField }) => (
                      <SelectField
                        id={`history-status-${index}`}
                        value={statusField.value}
                        disabled={disabled}
                        onChange={statusField.onChange}
                      >
                        <option value="">Belum ditentukan</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="RESOLVED">Terselesaikan</option>
                        <option value="UNKNOWN">Tidak diketahui</option>
                      </SelectField>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`history-note-${index}`}>
                    Catatan tambahan
                  </FieldLabel>
                  <Input
                    {...register(`histories.${index}.note`)}
                    id={`history-note-${index}`}
                    type="text"
                    disabled={disabled}
                    placeholder="Catatan klinis singkat (opsional)"
                    className="text-xs"
                  />
                </Field>
              </div>
            </div>
          );
        })}
        {fields.length === 0 ? (
          <p className="rounded-[var(--radius-control)] border border-dashed border-border p-3 text-xs text-muted-foreground">
            Belum ada riwayat tambahan. Biarkan kosong bila belum diketahui.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
