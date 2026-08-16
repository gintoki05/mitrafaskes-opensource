"use client";

import { Plus, Thermometer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  RmePrescription,
  RmePrescriptionField,
  RmePresetBundle,
} from "./types";

type RmePrescriptionSectionProps = {
  prescriptions: RmePrescription[];
  onAddPrescription: () => void;
  onUpdatePrescription: (
    index: number,
    field: RmePrescriptionField,
    value: string | number,
  ) => void;
  onApplyPresetBundle: (type: RmePresetBundle) => void;
};

export function RmePrescriptionSection({
  prescriptions,
  onAddPrescription,
  onUpdatePrescription,
  onApplyPresetBundle,
}: RmePrescriptionSectionProps) {
  return (
    <Card
      id="rme-section-prescriptions"
      className="scroll-mt-24"
      tabIndex={-1}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Thermometer className="h-4 w-4 text-warning" />
          4. Resep Obat (KFA)
        </CardTitle>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAddPrescription}
          className="border-primary/20 text-xs font-semibold text-primary"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Obat
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">
            Preset Cepat Dokter:
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApplyPresetBundle("ISPA")}
            className="border-primary/30 text-[11px] text-primary"
          >
            <Zap aria-hidden="true" className="h-3.5 w-3.5" />
            Paket ISPA / Flu
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApplyPresetBundle("GASTRITIS")}
            className="border-warning/30 text-[11px] text-warning"
          >
            <Zap aria-hidden="true" className="h-3.5 w-3.5" />
            Paket Gastritis / Maag
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApplyPresetBundle("HYPERTENSION")}
            className="border-destructive/30 text-[11px] text-destructive"
          >
            <Zap aria-hidden="true" className="h-3.5 w-3.5" />
            Paket Hipertensi
          </Button>
        </div>

        <div className="space-y-3">
          {prescriptions.map((prescription, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3 sm:grid-cols-6"
            >
              <div className="sm:col-span-2">
                <Input
                  type="text"
                  value={prescription.medicineName}
                  onChange={(event) =>
                    onUpdatePrescription(
                      index,
                      "medicineName",
                      event.target.value,
                    )
                  }
                  placeholder="Nama Obat (Contoh: Paracetamol 500mg)"
                  className="text-xs"
                  aria-label={`Nama obat resep ${index + 1}`}
                />
              </div>
              <div>
                <Input
                  type="text"
                  value={prescription.kfaCode ?? ""}
                  onChange={(event) =>
                    onUpdatePrescription(index, "kfaCode", event.target.value)
                  }
                  placeholder="Kode KFA (opsional)"
                  className="text-xs font-mono"
                  aria-label={`Kode KFA obat resep ${index + 1}`}
                />
              </div>
              <div>
                <Input
                  type="text"
                  value={prescription.dosage}
                  onChange={(event) =>
                    onUpdatePrescription(index, "dosage", event.target.value)
                  }
                  placeholder="Dosis (contoh: 1 tablet)"
                  className="text-xs"
                  aria-label={`Dosis obat resep ${index + 1}`}
                />
              </div>
              <div>
                <Input
                  type="text"
                  value={prescription.frequency}
                  onChange={(event) =>
                    onUpdatePrescription(index, "frequency", event.target.value)
                  }
                  placeholder="Aturan Pakai (Contoh: 3x Sehari)"
                  className="text-xs"
                  aria-label={`Aturan pakai resep ${index + 1}`}
                />
              </div>
              <div>
                <Input
                  type="number"
                  value={prescription.quantity}
                  onChange={(event) =>
                    onUpdatePrescription(
                      index,
                      "quantity",
                      Number(event.target.value),
                    )
                  }
                  placeholder="Jumlah"
                  className="text-xs font-mono"
                  aria-label={`Jumlah obat resep ${index + 1}`}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="text"
                  value={prescription.instructions ?? ""}
                  onChange={(event) =>
                    onUpdatePrescription(
                      index,
                      "instructions",
                      event.target.value,
                    )
                  }
                  placeholder="Instruksi pasien (opsional)"
                  className="text-xs"
                  aria-label={`Instruksi pasien resep ${index + 1}`}
                />
              </div>
            </div>
          ))}
          {prescriptions.length === 0 ? (
            <p className="rounded-[var(--radius-control)] border border-dashed border-border p-3 text-xs text-muted-foreground">
              Belum ada resep. Kunjungan tanpa resep tetap dapat disimpan
              sebagai draft.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
