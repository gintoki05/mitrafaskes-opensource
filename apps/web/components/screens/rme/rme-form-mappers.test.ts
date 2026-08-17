import assert from "node:assert/strict";
import test from "node:test";
import {
  ClinicalHistoryCategory,
  ClinicalHistoryStatus,
  MedicalRecordServiceProfile,
  MedicalRecordStatus,
} from "@mitrafaskes/shared";
import type { MedicalRecord } from "@mitrafaskes/shared";
import { formValuesFrom } from "./rme-form-mappers.ts";

test("RME mapper restores structured histories, added vitals, and prescription details", () => {
  const record = {
    id: "rme-1",
    encounterId: "encounter-1",
    status: MedicalRecordStatus.DRAFT,
    version: 2,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    validationProfile: "OUTPATIENT_GENERAL_V1",
    histories: [
      {
        id: "history-1",
        category: ClinicalHistoryCategory.FAMILY,
        text: "Ayah dengan diabetes",
        status: ClinicalHistoryStatus.ACTIVE,
        onset: "2018-01-01T00:00:00.000Z",
        note: "Informasi dari pasien",
      },
    ],
    observations: [
      {
        id: "observation-1",
        category: "vital-signs",
        code: { code: "9279-1", display: "Respiratory rate" },
        value: { type: "quantity", value: 18, unit: "/min" },
        effectiveAt: "2026-08-13T03:00:00.000Z",
        status: "final",
        provenance: "original",
        derivedFromObservationIds: [],
      },
      {
        id: "observation-2",
        category: "vital-signs",
        code: { code: "2708-6", display: "Oxygen saturation" },
        value: { type: "quantity", value: 98, unit: "%" },
        effectiveAt: "2026-08-13T03:00:00.000Z",
        status: "final",
        provenance: "original",
        derivedFromObservationIds: [],
      },
    ],
    diagnoses: [],
    prescriptions: [
      {
        id: "prescription-1",
        medicineName: "Paracetamol 500 mg",
        kfaCode: "KFA-001",
        dosage: "1 tablet",
        frequency: "3x sehari",
        quantity: 10,
        instructions: "Sesudah makan",
      },
    ],
    createdAt: "2026-08-13T03:00:00.000Z",
    updatedAt: "2026-08-13T03:00:00.000Z",
  } satisfies MedicalRecord;

  const values = formValuesFrom(record);

  assert.deepEqual(values.histories, [
    {
      id: "history-1",
      category: "FAMILY",
      text: "Ayah dengan diabetes",
      status: "ACTIVE",
      onset: "2018-01-01",
      note: "Informasi dari pasien",
    },
  ]);
  assert.equal(values.respiratoryRate, "18");
  assert.equal(values.oxygenSaturation, "98");
  assert.deepEqual(values.prescriptions[0], {
    medicineName: "Paracetamol 500 mg",
    kfaCode: "KFA-001",
    dosage: "1 tablet",
    frequency: "3x sehari",
    quantity: 10,
    instructions: "Sesudah makan",
  });
});
