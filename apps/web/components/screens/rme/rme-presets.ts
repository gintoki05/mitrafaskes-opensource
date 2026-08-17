import type { RmeFormValues } from "./rme-form-schema";
import type { RmePresetBundle } from "./types";

export function rmePresetValues(
  type: RmePresetBundle,
): Pick<RmeFormValues, "diagnoses" | "prescriptions"> {
  if (type === "ISPA") {
    return {
      diagnoses: [
        {
          icd10Code: "J00",
          nameIndo: "Nasofaringitis Akut (Flu / Batuk Pilek)",
          isPrimary: true,
        },
      ],
      prescriptions: [
        {
          medicineName: "Paracetamol 500mg",
          kfaCode: "",
          dosage: "1 Tablet",
          frequency: "3x sehari",
          quantity: 10,
          instructions: "Sesudah makan",
        },
        {
          medicineName: "CTM 4mg",
          kfaCode: "",
          dosage: "1 Tablet",
          frequency: "3x sehari",
          quantity: 10,
          instructions: "Sesudah makan",
        },
        {
          medicineName: "Vitamin C 50mg",
          kfaCode: "",
          dosage: "1 Tablet",
          frequency: "2x sehari",
          quantity: 10,
          instructions: "Sesudah makan",
        },
      ],
    };
  }

  if (type === "GASTRITIS") {
    return {
      diagnoses: [
        {
          icd10Code: "K29.7",
          nameIndo: "Gastritis, Tidak Spesifik (Sakit Maag)",
          isPrimary: true,
        },
      ],
      prescriptions: [
        {
          medicineName: "Antasida Doen",
          kfaCode: "",
          dosage: "1 Tablet Kunyah",
          frequency: "3x sehari",
          quantity: 12,
          instructions: "Sebelum makan",
        },
        {
          medicineName: "Omeprazole 20mg",
          kfaCode: "",
          dosage: "1 Kapsul",
          frequency: "2x sehari",
          quantity: 10,
          instructions: "Sebelum makan",
        },
      ],
    };
  }

  return {
    diagnoses: [
      {
        icd10Code: "I10",
        nameIndo: "Hipertensi Esensial (Tekanan Darah Tinggi)",
        isPrimary: true,
      },
    ],
    prescriptions: [
      {
        medicineName: "Amlodipine 5mg",
        kfaCode: "",
        dosage: "1 Tablet",
        frequency: "1x sehari",
        quantity: 30,
        instructions: "Pagi hari",
      },
    ],
  };
}
