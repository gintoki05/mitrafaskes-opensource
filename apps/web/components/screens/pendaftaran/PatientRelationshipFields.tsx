"use client";

import { Plus } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Relasi pasien</CardTitle>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Tambahkan lebih dari satu relasi. Setiap baris bisa diedit atau
              dihapus; relasi historis tetap tersimpan di riwayat pasien.
            </p>
          </div>
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
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {fields.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
            Belum ada relasi aktif. Tambahkan relasi bila pasien memiliki wali,
            orang tua, anak, atau pendamping yang perlu dicatat.
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
          Menghapus baris lalu menyimpan pasien akan mengakhiri relasi aktif
          tersebut. Catatan historis tidak dihapus.
        </p>
      </CardContent>
    </Card>
  );
}
