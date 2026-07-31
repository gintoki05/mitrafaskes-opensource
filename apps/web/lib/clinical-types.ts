export interface Patient {
  id: string;
  fullName: string;
  medicalRecNo: string;
  nik: string;
  gender: 'MALE' | 'FEMALE';
  satusehatId?: string;
}

export interface Encounter {
  id: string;
  queueNumber: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | string;
  patient?: Patient;
}

export interface SyncLog {
  id: string;
  resourceId: string;
  resourceType: string;
  updatedAt: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | string;
  satusehatId?: string;
  payload: unknown;
}

export interface Icd10Entry {
  code: string;
  nameIndo: string;
  nameEng: string;
}
