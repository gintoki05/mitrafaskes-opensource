import { z } from "zod";
import { AllergyReviewStatus, OutpatientDisposition } from '@mitrafaskes/shared';

export const rmeFormSchema = z.object({
  chiefComplaint: z.string(),
  presentIllness: z.string(),
  allergyReviewStatus: z.union([
    z.enum(AllergyReviewStatus),
    z.literal(''),
  ]),
  allergyDetails: z.string(),
  physicalExam: z.string(),
  education: z.string(),
  carePlan: z.string(),
  disposition: z.union([
    z.enum(OutpatientDisposition),
    z.literal(''),
  ]),
  anamnesis: z.string(),
  systolic: z.string(),
  diastolic: z.string(),
  heartRate: z.string(),
  temperature: z.string(),
  diagnoses: z.array(
    z.object({
      id: z.string().optional(),
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

export function emptyRmeFormValues(): RmeFormValues {
  return {
    chiefComplaint: '',
    presentIllness: '',
    allergyReviewStatus: '',
    allergyDetails: '',
    physicalExam: '',
    education: '',
    carePlan: '',
    disposition: '',
    anamnesis: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    temperature: '',
    diagnoses: [],
    prescriptions: [],
  };
}
