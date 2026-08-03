import { z } from "zod";

export const organizationFormSchema = z.object({
  code: z.string().trim().min(1, "Kode master wajib diisi."),
  name: z.string().trim().min(1, "Nama organisasi wajib diisi."),
  type: z.enum(["HEALTHCARE_FACILITY", "SUB_ORGANIZATION"]),
  parentId: z.string(),
  addressText: z.string().trim(),
  phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid.")
    .or(z.literal("")),
  active: z.boolean(),
});

export const serviceUnitFormSchema = z.object({
  organizationId: z.string().min(1, "Organisasi induk wajib dipilih."),
  parentId: z.string(),
  code: z.string().trim().min(1, "Kode unit wajib diisi."),
  name: z.string().trim().min(1, "Nama unit wajib diisi."),
  type: z.enum(["POLYCLINIC", "DEPARTMENT", "SUPPORT", "OTHER"]),
  active: z.boolean(),
});

export const locationFormSchema = z.object({
  organizationId: z.string().min(1, "Organisasi induk wajib dipilih."),
  serviceUnitId: z.string(),
  parentId: z.string(),
  code: z.string().trim().min(1, "Kode lokasi wajib diisi."),
  name: z.string().trim().min(1, "Nama lokasi wajib diisi."),
  type: z.enum(["BUILDING", "FLOOR", "ROOM", "OTHER"]),
  description: z.string().trim(),
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]),
  mode: z.enum(["INSTANCE", "KIND"]),
  physicalTypeCode: z.string().trim(),
  addressText: z.string().trim(),
  city: z.string().trim(),
  postalCode: z.string().trim(),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Kode negara harus terdiri dari 2 karakter."),
  active: z.boolean(),
});
