import { z } from "zod";
import { Gender, PatientRelationshipCode } from "@mitrafaskes/shared";

const optionalValue = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || value.length > 0, message);

const relationshipCodeSchema = z.enum([
  "",
  PatientRelationshipCode.MOTHER,
  PatientRelationshipCode.FATHER,
  PatientRelationshipCode.CHILD,
  PatientRelationshipCode.GUARDIAN,
  PatientRelationshipCode.CAREGIVER,
  PatientRelationshipCode.OTHER,
]);

export const patientRelationshipFormSchema = z
  .object({
    relationshipTarget: z.enum(["", "PATIENT", "PERSON"]),
    relationshipCode: relationshipCodeSchema,
    relatedPatientId: z.string().trim(),
    relatedPersonId: z.string().trim(),
    relatedPersonName: optionalValue("Nama related person tidak valid."),
    relatedPersonGender: z.enum(["", Gender.MALE, Gender.FEMALE]),
    relatedPersonBirthDate: z.string(),
    relatedPersonPhone: optionalValue("Telepon related person tidak valid."),
    relatedPersonEmail: z
      .string()
      .trim()
      .refine(
        (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        "Email related person tidak valid.",
      ),
    relatedPersonAddress: optionalValue("Alamat related person tidak valid."),
    startAt: z.string(),
    endAt: z.string(),
    isGuardian: z.boolean(),
    contactPriority: z
      .string()
      .trim()
      .refine(
        (value) => !value || (/^\d+$/.test(value) && Number(value) > 0),
        "Prioritas kontak harus berupa angka positif.",
      ),
  })
  .superRefine((values, context) => {
    const hasAnyValue =
      [
        values.relationshipTarget,
        values.relationshipCode,
        values.relatedPatientId,
        values.relatedPersonId,
        values.relatedPersonName,
        values.relatedPersonGender,
        values.relatedPersonBirthDate,
        values.relatedPersonPhone,
        values.relatedPersonEmail,
        values.relatedPersonAddress,
        values.startAt,
        values.endAt,
        values.contactPriority,
      ].some(Boolean) || values.isGuardian;

    if (!hasAnyValue) {
      context.addIssue({
        code: "custom",
        path: ["relationshipCode"],
        message: "Lengkapi relasi ini atau hapus barisnya.",
      });
      return;
    }

    if (!values.relationshipCode) {
      context.addIssue({
        code: "custom",
        path: ["relationshipCode"],
        message: "Jenis relasi wajib dipilih.",
      });
    }
    if (!values.relationshipTarget) {
      context.addIssue({
        code: "custom",
        path: ["relationshipTarget"],
        message: "Target relasi wajib dipilih.",
      });
    }
    if (values.relationshipTarget === "PATIENT" && !values.relatedPatientId) {
      context.addIssue({
        code: "custom",
        path: ["relatedPatientId"],
        message: "ID Patient lokal terkait wajib diisi.",
      });
    }
    if (
      values.relationshipTarget === "PERSON" &&
      !values.relatedPersonId &&
      !values.relatedPersonName
    ) {
      context.addIssue({
        code: "custom",
        path: ["relatedPersonName"],
        message: "Nama related person wajib diisi.",
      });
    }
    if (values.startAt && values.endAt && values.endAt < values.startAt) {
      context.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "Tanggal akhir tidak boleh mendahului tanggal mulai.",
      });
    }
  });

export type PatientRelationshipFormValues = z.infer<
  typeof patientRelationshipFormSchema
>;

export const patientRelationshipFormDefaults: PatientRelationshipFormValues = {
  relationshipTarget: "",
  relationshipCode: "",
  relatedPatientId: "",
  relatedPersonId: "",
  relatedPersonName: "",
  relatedPersonGender: "",
  relatedPersonBirthDate: "",
  relatedPersonPhone: "",
  relatedPersonEmail: "",
  relatedPersonAddress: "",
  startAt: "",
  endAt: "",
  isGuardian: false,
  contactPriority: "",
};

export const patientFormSchema = z.object({
  nik: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{16}$/.test(value), {
      message: "NIK harus terdiri dari 16 digit angka.",
    }),
  motherNik: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{16}$/.test(value), {
      message: "NIK ibu harus terdiri dari 16 digit angka.",
    }),
  passport: optionalValue("Nomor paspor tidak valid."),
  familyCard: optionalValue("Nomor kartu keluarga tidak valid."),
  satusehatId: optionalValue("Nomor IHS / SATUSEHAT ID tidak valid."),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter.")
    .max(150, "Nama lengkap maksimal 150 karakter."),
  preferredName: optionalValue("Nama panggilan tidak valid."),
  aliasName: optionalValue("Nama alias tidak valid."),
  birthDate: z.string().min(1, "Tanggal lahir wajib diisi."),
  gender: z.enum([Gender.MALE, Gender.FEMALE]),
  birthPlaceText: optionalValue("Tempat lahir tidak valid."),
  maritalStatusCode: optionalValue("Status perkawinan tidak valid."),
  citizenshipCode: z
    .string()
    .trim()
    .refine((value) => !value || /^[A-Za-z]{3}$/.test(value), {
      message: "Kode kewarganegaraan harus 3 huruf ISO.",
    }),
  phone: optionalValue("Nomor telepon tidak valid."),
  email: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Alamat email tidak valid.",
    ),
  addressText: optionalValue("Alamat tidak valid."),
  postalCode: optionalValue("Kode pos tidak valid."),
  provinceCode: optionalValue("Kode provinsi tidak valid."),
  provinceName: optionalValue("Provinsi tidak valid."),
  regencyCode: optionalValue("Kode kabupaten/kota tidak valid."),
  regencyName: optionalValue("Kabupaten/kota tidak valid."),
  districtCode: optionalValue("Kode kecamatan tidak valid."),
  districtName: optionalValue("Kecamatan tidak valid."),
  villageCode: optionalValue("Kode desa/kelurahan tidak valid."),
  villageName: optionalValue("Desa/kelurahan tidak valid."),
  active: z.boolean(),
  relationships: z.array(patientRelationshipFormSchema),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const patientFormDefaults: PatientFormValues = {
  nik: "",
  motherNik: "",
  passport: "",
  familyCard: "",
  satusehatId: "",
  fullName: "",
  preferredName: "",
  aliasName: "",
  birthDate: "",
  gender: Gender.MALE,
  birthPlaceText: "",
  maritalStatusCode: "",
  citizenshipCode: "IDN",
  phone: "",
  email: "",
  addressText: "",
  postalCode: "",
  provinceCode: "",
  provinceName: "",
  regencyCode: "",
  regencyName: "",
  districtCode: "",
  districtName: "",
  villageCode: "",
  villageName: "",
  active: true,
  relationships: [],
};
