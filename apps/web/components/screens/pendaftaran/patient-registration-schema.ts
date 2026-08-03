import { z } from "zod";

export const patientRegistrationSchema = z.object({
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka."),
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi."),
  birthDate: z.string().min(1, "Tanggal lahir wajib diisi."),
  gender: z.enum(["MALE", "FEMALE"]),
  address: z.string().trim(),
});

export type PatientRegistrationFormValues = z.infer<
  typeof patientRegistrationSchema
>;

export const patientRegistrationDefaults: PatientRegistrationFormValues = {
  nik: "",
  fullName: "",
  birthDate: "1992-05-10",
  gender: "MALE",
  address: "",
};
