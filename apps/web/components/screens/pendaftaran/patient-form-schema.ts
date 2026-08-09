import { z } from 'zod';
import {
  Gender,
  PatientRelationshipCode,
} from '@mitrafaskes/shared';

const optionalValue = (message: string) =>
  z.string().trim().refine((value) => !value || value.length > 0, message);

export const patientFormSchema = z
  .object({
    nik: z.string().trim().refine((value) => !value || /^\d{16}$/.test(value), {
      message: 'NIK harus terdiri dari 16 digit angka.',
    }),
    motherNik: z
      .string()
      .trim()
      .refine((value) => !value || /^\d{16}$/.test(value), {
        message: 'NIK ibu harus terdiri dari 16 digit angka.',
      }),
    passport: optionalValue('Nomor paspor tidak valid.'),
    familyCard: optionalValue('Nomor kartu keluarga tidak valid.'),
    otherIdentifierSystem: optionalValue('Namespace identifier wajib diisi.'),
    otherIdentifierValue: optionalValue('Nilai identifier wajib diisi.'),
    fullName: z
      .string()
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter.')
      .max(150, 'Nama lengkap maksimal 150 karakter.'),
    preferredName: optionalValue('Nama panggilan tidak valid.'),
    aliasName: optionalValue('Nama alias tidak valid.'),
    birthDate: z.string().min(1, 'Tanggal lahir wajib diisi.'),
    gender: z.enum([Gender.MALE, Gender.FEMALE]),
    birthPlaceText: optionalValue('Tempat lahir tidak valid.'),
    maritalStatusCode: optionalValue('Status perkawinan tidak valid.'),
    citizenshipCode: z
      .string()
      .trim()
      .refine((value) => !value || /^[A-Za-z]{3}$/.test(value), {
        message: 'Kode kewarganegaraan harus 3 huruf ISO.',
      }),
    phone: optionalValue('Nomor telepon tidak valid.'),
    email: z.string().trim().refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Alamat email tidak valid.',
    }),
    addressText: optionalValue('Alamat tidak valid.'),
    postalCode: optionalValue('Kode pos tidak valid.'),
    provinceCode: optionalValue('Kode provinsi tidak valid.'),
    provinceName: optionalValue('Provinsi tidak valid.'),
    regencyCode: optionalValue('Kode kabupaten/kota tidak valid.'),
    regencyName: optionalValue('Kabupaten/kota tidak valid.'),
    districtCode: optionalValue('Kode kecamatan tidak valid.'),
    districtName: optionalValue('Kecamatan tidak valid.'),
    villageCode: optionalValue('Kode desa/kelurahan tidak valid.'),
    villageName: optionalValue('Desa/kelurahan tidak valid.'),
    active: z.boolean(),
    relationshipTarget: z.enum(['', 'PATIENT', 'PERSON']),
    relationshipCode: z.enum([
      '',
      PatientRelationshipCode.MOTHER,
      PatientRelationshipCode.FATHER,
      PatientRelationshipCode.CHILD,
      PatientRelationshipCode.GUARDIAN,
      PatientRelationshipCode.CAREGIVER,
      PatientRelationshipCode.OTHER,
    ]),
    relatedPatientId: z.string().trim(),
    relatedPersonId: z.string().trim(),
    relatedPersonName: optionalValue('Nama related person tidak valid.'),
    relatedPersonGender: z.enum(['', Gender.MALE, Gender.FEMALE]),
    relatedPersonBirthDate: z.string(),
    relatedPersonPhone: optionalValue('Telepon related person tidak valid.'),
    relatedPersonEmail: z.string().trim().refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Email related person tidak valid.',
    }),
    relatedPersonAddress: optionalValue('Alamat related person tidak valid.'),
  })
  .superRefine((values, context) => {
    if (values.otherIdentifierValue && !values.otherIdentifierSystem) {
      context.addIssue({
        code: 'custom',
        path: ['otherIdentifierSystem'],
        message: 'Namespace identifier wajib diisi.',
      });
    }
    if (values.otherIdentifierSystem && !values.otherIdentifierValue) {
      context.addIssue({
        code: 'custom',
        path: ['otherIdentifierValue'],
        message: 'Nilai identifier wajib diisi.',
      });
    }
    const hasRelationship =
      values.relationshipTarget !== '' ||
      values.relatedPatientId ||
      values.relatedPersonName;
    if (hasRelationship && !values.relationshipCode) {
      context.addIssue({
        code: 'custom',
        path: ['relationshipCode'],
        message: 'Jenis relasi wajib dipilih.',
      });
    }
  });

export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const patientFormDefaults: PatientFormValues = {
  nik: '',
  motherNik: '',
  passport: '',
  familyCard: '',
  otherIdentifierSystem: '',
  otherIdentifierValue: '',
  fullName: '',
  preferredName: '',
  aliasName: '',
  birthDate: '',
  gender: Gender.MALE,
  birthPlaceText: '',
  maritalStatusCode: '',
  citizenshipCode: 'IDN',
  phone: '',
  email: '',
  addressText: '',
  postalCode: '',
  provinceCode: '',
  provinceName: '',
  regencyCode: '',
  regencyName: '',
  districtCode: '',
  districtName: '',
  villageCode: '',
  villageName: '',
  active: true,
  relationshipTarget: '',
  relationshipCode: '',
  relatedPatientId: '',
  relatedPersonId: '',
  relatedPersonName: '',
  relatedPersonGender: '',
  relatedPersonBirthDate: '',
  relatedPersonPhone: '',
  relatedPersonEmail: '',
  relatedPersonAddress: '',
};
