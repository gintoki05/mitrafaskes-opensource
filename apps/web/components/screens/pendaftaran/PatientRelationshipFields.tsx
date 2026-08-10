"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  patientRelationshipFormDefaults,
  type PatientFormValues,
  type PatientRelationshipFormValues,
} from "./patient-form-schema";
import { PatientRelationshipRow } from "./PatientRelationshipRow";

type PatientRelationshipFieldsProps = {
  control: Control<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  disabled: boolean;
};

export function PatientRelationshipFields({
  control,
  errors,
  register,
  disabled,
}: PatientRelationshipFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "relationships",
  });
  const [relationshipsOpen, setRelationshipsOpen] = useState(
    () => fields.length > 0,
  );
  return (
    <details
      className="group rounded-[var(--radius-card)] border border-border bg-card"
      open={relationshipsOpen}
      onToggle={(event) => setRelationshipsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Relasi pasien</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {fields.length ? `${fields.length} relasi` : 'Opsional'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Tambahkan wali, orang tua, atau pendamping bila perlu.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => append(patientRelationshipFormDefaults)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah relasi
          </Button>
        </div>
        {fields.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Belum ada relasi.
          </div>
        ) : (
          fields.map((field, index) => (
            <PatientRelationshipRow
              key={field.id}
              control={control}
              errors={
                errors.relationships?.[index] as
                  FieldErrors<PatientRelationshipFormValues> | undefined
              }
              register={register}
              index={index}
              disabled={disabled}
              onRemove={() => remove(index)}
            />
          ))
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Relasi yang dihapus tidak menghapus riwayat pasien.
        </p>
      </div>
    </details>
  );
}
