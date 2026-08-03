import { z } from "zod";

export const rmeFormSchema = z.object({
  anamnesis: z.string().trim().min(1, "Anamnesis wajib diisi."),
  systolic: z.string(),
  diastolic: z.string(),
  heartRate: z.string(),
  temperature: z.string(),
  diagnoses: z.array(
    z.object({
      icd10Code: z.string(),
      nameIndo: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
  prescriptions: z.array(
    z.object({
      medicineName: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      quantity: z.number().int().min(0),
    }),
  ),
});

export type RmeFormValues = z.infer<typeof rmeFormSchema>;
