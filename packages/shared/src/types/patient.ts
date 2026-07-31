export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export interface Patient {
  id: string;
  nik?: string;
  fullName: string;
  birthDate: string;
  gender: Gender;
  address?: string;
  phone?: string;
  medicalRecNo: string;
  satusehatId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientDto {
  nik?: string;
  fullName: string;
  birthDate: string;
  gender: Gender;
  address?: string;
  phone?: string;
}
