import type { MedicalRecord } from "@mitrafaskes/shared";
import { emptyRmeFormValues, type RmeFormValues } from "./rme-form-schema.ts";

export function formValuesFrom(record: MedicalRecord | null): RmeFormValues {
  if (!record) return emptyRmeFormValues();
  const quantityFor = (codes: readonly string[]) => {
    const observation = (record.observations ?? []).find((candidate) =>
      codes.includes(candidate.code.code),
    );
    return observation?.value.type === "quantity"
      ? String(observation.value.value)
      : "";
  };
  return {
    chiefComplaint: record.chiefComplaint ?? "",
    presentIllness: record.presentIllness ?? "",
    allergyReviewStatus: record.allergyReviewStatus ?? "",
    allergyDetails: record.allergyDetails ?? "",
    physicalExam: record.physicalExam ?? "",
    education: record.education ?? "",
    carePlan: record.carePlan ?? "",
    disposition: record.disposition ?? "",
    anamnesis: record.anamnesis ?? "",
    histories: (record.histories ?? []).map((history) => ({
      id: history.id,
      category: history.category,
      text: history.text,
      status: history.status ?? "",
      onset: history.onset?.slice(0, 10) ?? "",
      note: history.note ?? "",
    })),
    systolic: record.systolic === undefined ? "" : String(record.systolic),
    diastolic: record.diastolic === undefined ? "" : String(record.diastolic),
    heartRate: record.heartRate === undefined ? "" : String(record.heartRate),
    temperature:
      record.temperature === undefined ? "" : String(record.temperature),
    weight: record.weight === undefined ? "" : String(record.weight),
    height: record.height === undefined ? "" : String(record.height),
    respiratoryRate: quantityFor(["9279-1"]),
    oxygenSaturation: quantityFor(["2708-6"]),
    diagnoses: record.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      icd10Code: diagnosis.icd10Code,
      nameIndo:
        diagnosis.icd10?.nameIndo ??
        diagnosis.icd10?.display ??
        diagnosis.icd10Code,
      isPrimary: diagnosis.isPrimary,
    })),
    prescriptions: record.prescriptions.map((prescription) => ({
      medicineName: prescription.medicineName,
      kfaCode: prescription.kfaCode ?? "",
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      quantity: prescription.quantity,
      instructions: prescription.instructions ?? "",
    })),
  };
}
