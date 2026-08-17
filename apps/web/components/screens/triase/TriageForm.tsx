"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  ClinicalHistoryCategory,
  ClinicalHistoryStatus,
  MedicalRecord,
  RmeValidationIssue,
} from "@mitrafaskes/shared";
import {
  ClinicalHistoryCategory as HistoryCategory,
  ClinicalHistoryStatus as HistoryStatus,
} from "@mitrafaskes/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { SelectField } from "@/components/screens/master-faskes/FormField";
import { RmeVitalSigns } from "../rme/RmeVitalSigns";
import { RmeSectionIssues } from "../rme/RmeFinalizationIssues";
import type { TriageFormValues } from "./triage-types";
import { triageValuesFrom } from "./triage-types";
import type { TriageMutationState } from "./useTriageLifecycle";

export function TriageForm({
  record,
  mutationState,
  issues,
  canSave,
  canComplete,
  onSave,
  onComplete,
  onReload,
}: {
  record: MedicalRecord | null;
  mutationState: TriageMutationState;
  issues: RmeValidationIssue[];
  canSave: boolean;
  canComplete: boolean;
  onSave: (values: TriageFormValues) => Promise<void>;
  onComplete: () => Promise<void>;
  onReload: () => void;
}) {
  const [values, setValues] = useState<TriageFormValues>(() =>
    triageValuesFrom(record),
  );
  const [editingCompleted, setEditingCompleted] = useState(false);
  const busy = mutationState !== "idle";
  const completed = record?.triageStatus === "COMPLETED" && !editingCompleted;

  const update = <K extends keyof TriageFormValues>(
    field: K,
    value: TriageFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(values);
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Card
        className={
          completed ? "border-success/30 bg-success/5" : "border-primary/20"
        }
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-bold text-foreground">
              {completed
                ? "Triase selesai"
                : record
                  ? "Draft triase"
                  : "Triase baru"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {completed
                ? `Triase telah diselesaikan oleh ${record?.triageCompletedByName ?? "perawat"}; dokter tetap meninjau saat pemeriksaan.`
                : "Isi data awal pasien, simpan, lalu tandai siap diperiksa."}
            </p>
          </div>
          {completed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingCompleted(true)}
            >
              Koreksi triase
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <fieldset disabled={completed || busy} className="space-y-6">
        <Card data-rme-section="anamnesis" tabIndex={-1}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <FileText className="h-4 w-4 text-primary" />
              Anamnesis awal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="triage-chief-complaint" required>
                Keluhan utama
              </FieldLabel>
              <textarea
                id="triage-chief-complaint"
                value={values.chiefComplaint}
                onChange={(event) =>
                  update("chiefComplaint", event.target.value)
                }
                rows={3}
                className="clinical-field w-full p-3 text-xs"
                placeholder="Keluhan utama pasien"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="triage-present-illness">
                Riwayat penyakit sekarang
              </FieldLabel>
              <textarea
                id="triage-present-illness"
                value={values.presentIllness}
                onChange={(event) =>
                  update("presentIllness", event.target.value)
                }
                rows={4}
                className="clinical-field w-full p-3 text-xs"
                placeholder="Onset, durasi, gejala terkait, dan informasi awal dari pasien"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="triage-anamnesis">
                Catatan anamnesis tambahan
              </FieldLabel>
              <textarea
                id="triage-anamnesis"
                value={values.anamnesis}
                onChange={(event) => update("anamnesis", event.target.value)}
                rows={3}
                className="clinical-field w-full p-3 text-xs"
                placeholder="Catatan tambahan bila diperlukan"
              />
            </Field>
            <RmeSectionIssues issues={issues} section="anamnesis" />
          </CardContent>
        </Card>

        <Card data-rme-section="allergies" tabIndex={-1}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Review alergi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="triage-allergy-status" required>
                Status review alergi
              </FieldLabel>
              <SelectField
                id="triage-allergy-status"
                value={values.allergyReviewStatus}
                onChange={(value) =>
                  update(
                    "allergyReviewStatus",
                    value as TriageFormValues["allergyReviewStatus"],
                  )
                }
              >
                <option value="">Pilih hasil review</option>
                <option value="NONE_KNOWN">
                  Tidak ada alergi yang diketahui
                </option>
                <option value="KNOWN">
                  Alergi diketahui dan telah direview
                </option>
                <option value="NOT_REVIEWED">Belum direview</option>
              </SelectField>
            </Field>
            <Field>
              <FieldLabel htmlFor="triage-allergy-details">
                Detail alergi
              </FieldLabel>
              <textarea
                id="triage-allergy-details"
                value={values.allergyDetails}
                onChange={(event) =>
                  update("allergyDetails", event.target.value)
                }
                rows={3}
                className="clinical-field w-full p-3 text-xs"
                placeholder="Zat/produk dan reaksi bila diketahui"
              />
            </Field>
            <RmeSectionIssues issues={issues} section="allergies" />
          </CardContent>
        </Card>

        <div data-rme-section="vitalSigns" tabIndex={-1}>
          <RmeVitalSigns
            {...values}
            onChange={(field, value) => update(field, value)}
          />
          <RmeSectionIssues issues={issues} section="vitalSigns" />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <ClipboardList className="h-4 w-4 text-primary" />
              Riwayat terstruktur tambahan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {values.histories.map((history, index) => (
              <div
                key={history.id ?? `history-${index}`}
                className="grid gap-3 rounded-[var(--radius-control)] border border-border p-3 sm:grid-cols-[1fr_2fr_auto]"
              >
                <SelectField
                  id={`triage-history-category-${index}`}
                  aria-label={`Kategori riwayat ${index + 1}`}
                  value={history.category}
                  onChange={(value) =>
                    update(
                      "histories",
                      values.histories.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              category: value as ClinicalHistoryCategory,
                            }
                          : item,
                      ),
                    )
                  }
                >
                  <option value={HistoryCategory.PAST_MEDICAL}>
                    Riwayat penyakit
                  </option>
                  <option value={HistoryCategory.FAMILY}>
                    Riwayat keluarga
                  </option>
                  <option value={HistoryCategory.MEDICATION}>Obat</option>
                  <option value={HistoryCategory.RISK}>Risiko</option>
                </SelectField>
                <textarea
                  aria-label={`Isi riwayat ${index + 1}`}
                  value={history.text}
                  onChange={(event) =>
                    update(
                      "histories",
                      values.histories.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, text: event.target.value }
                          : item,
                      ),
                    )
                  }
                  rows={2}
                  className="clinical-field w-full p-2 text-xs"
                  placeholder="Isi riwayat"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Hapus riwayat ${index + 1}`}
                  title="Hapus riwayat"
                  onClick={() =>
                    update(
                      "histories",
                      values.histories.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="sm:col-span-3">
                  <SelectField
                    id={`triage-history-status-${index}`}
                    aria-label={`Status riwayat ${index + 1}`}
                    value={history.status}
                    onChange={(value) =>
                      update(
                        "histories",
                        values.histories.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                status: value as ClinicalHistoryStatus | "",
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="">Status tidak diisi</option>
                    <option value={HistoryStatus.ACTIVE}>Aktif</option>
                    <option value={HistoryStatus.RESOLVED}>Selesai</option>
                    <option value={HistoryStatus.UNKNOWN}>
                      Tidak diketahui
                    </option>
                  </SelectField>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update("histories", [
                  ...values.histories,
                  {
                    category: HistoryCategory.PAST_MEDICAL,
                    text: "",
                    status: "",
                    onset: "",
                    note: "",
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Tambah riwayat
            </Button>
          </CardContent>
        </Card>
      </fieldset>

      {issues.length > 0 ? (
        <div
          role="alert"
          className="rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
        >
          Periksa bagian triase yang ditandai sebelum melanjutkan.
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onReload}
        >
          Muat ulang
        </Button>
        <Button
          id="btn-save-triage-draft"
          type="submit"
          disabled={!canSave || completed || busy}
        >
          <Save className="h-4 w-4" />
          {mutationState === "saving" ? "Menyimpan..." : "Simpan draft triase"}
        </Button>
        <Button
          type="button"
          disabled={!canComplete || completed || busy || !record}
          onClick={() => void onComplete()}
        >
          <CheckCircle2 className="h-4 w-4" />
          {mutationState === "completing" ? "Menandai..." : "Selesai triase"}
        </Button>
      </div>
    </form>
  );
}
