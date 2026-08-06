import { z } from "zod";

const optionalDecimal = (
  field: string,
  options: { min?: number; max?: number } = {},
) =>
  z.string().trim().refine(
    (value) => {
      if (!value) return true;
      const number = Number(value);
      return (
        Number.isFinite(number) &&
        (options.min === undefined || number >= options.min) &&
        (options.max === undefined || number <= options.max)
      );
    },
    `${field} harus berupa angka yang valid${
      options.min !== undefined && options.max !== undefined
        ? ` antara ${options.min} dan ${options.max}`
        : ""
    }.`,
  );

export const organizationFormSchema = z
  .object({
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
  })
  .superRefine((values, context) => {
    if (values.type === "SUB_ORGANIZATION" && !values.parentId) {
      context.addIssue({
        code: "custom",
        path: ["parentId"],
        message: "Sub-organisasi wajib memiliki organisasi induk.",
      });
    }
    if (values.type === "HEALTHCARE_FACILITY" && values.parentId) {
      context.addIssue({
        code: "custom",
        path: ["parentId"],
        message: "Faskes/organisasi induk tidak boleh memiliki induk.",
      });
    }
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
  latitude: optionalDecimal("Latitude", { min: -90, max: 90 }),
  longitude: optionalDecimal("Longitude", { min: -180, max: 180 }),
  altitude: optionalDecimal("Altitude"),
  active: z.boolean(),
});
