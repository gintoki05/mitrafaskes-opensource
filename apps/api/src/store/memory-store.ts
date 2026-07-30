export interface Patient {
  id: string;
  nik: string;
  fullName: string;
  birthDate: string;
  gender: string;
  address?: string;
  phone?: string;
  medicalRecNo: string;
  satusehatId?: string;
  createdAt: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  queueNumber: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  satusehatEncounterId?: string;
  createdAt: string;
  patient?: {
    nik: string;
    fullName: string;
    medicalRecNo: string;
  };
  doctor?: {
    fullName: string;
    sipNumber?: string;
  };
}

export interface MasterIcd10 {
  code: string;
  nameIndo: string;
  nameEng: string;
}

export interface SatusehatSyncLog {
  id: string;
  resourceType: 'Encounter' | 'Condition' | 'Observation' | 'MedicationRequest';
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload: any;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
}

export const INITIAL_ICD10: MasterIcd10[] = [
  { code: 'A09', nameIndo: 'Diare dan Gastroenteritis Infeksius', nameEng: 'Infectious gastroenteritis and colitis, unspecified' },
  { code: 'J00', nameIndo: 'Nasofaringitis Akut (Flu / Batuk Pilek)', nameEng: 'Acute nasopharyngitis [common cold]' },
  { code: 'I10', nameIndo: 'Hipertensi Esensial (Tekanan Darah Tinggi)', nameEng: 'Essential (primary) hypertension' },
  { code: 'E11', nameIndo: 'Diabetes Melitus Tipe 2', nameEng: 'Type 2 diabetes mellitus' },
  { code: 'K29.7', nameIndo: 'Gastritis, Tidak Spesifik (Sakit Maag)', nameEng: 'Gastritis, unspecified' },
  { code: 'J18.9', nameIndo: 'Pneumonia, Tidak Spesifik', nameEng: 'Pneumonia, unspecified' },
  { code: 'B35.4', nameIndo: 'Tinea Corporis (Panu / Kurap)', nameEng: 'Tinea corporis' },
  { code: 'R50.9', nameIndo: 'Demam, Tidak Spesifik', nameEng: 'Fever, unspecified' },
  { code: 'R51', nameIndo: 'Sakit Kepala / Cephalgia', nameEng: 'Headache' },
  { code: 'M79.1', nameIndo: 'Mialgia (Nyeri Otot)', nameEng: 'Myalgia' },
  { code: 'L03.9', nameIndo: 'Selulitis / Infeksi Kulit Akut', nameEng: 'Cellulitis, unspecified' },
  { code: 'H10.9', nameIndo: 'Konjungtivitis (Mata Merah)', nameEng: 'Conjunctivitis, unspecified' },
  { code: 'K02.9', nameIndo: 'Karies Gigi / Gigi Berlubang', nameEng: 'Dental caries, unspecified' },
  { code: 'J45.9', nameIndo: 'Asma Bronkial', nameEng: 'Asthma, unspecified' },
  { code: 'Z00.0', nameIndo: 'Pemeriksaan Kesehatan Umum (MCU)', nameEng: 'General medical examination' },
];

export class MemoryStore {
  static patients: Patient[] = [
    {
      id: 'pat-001',
      nik: '3171012304900001',
      fullName: 'Ahmad Supardi',
      birthDate: '1990-04-23',
      gender: 'MALE',
      address: 'Jl. Melati No. 12, Jakarta Selatan',
      phone: '081298765432',
      medicalRecNo: 'RM-2026-0001',
      satusehatId: 'P01928374-ID',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pat-002',
      nik: '3171025508950002',
      fullName: 'Siti Aminah',
      birthDate: '1995-08-15',
      gender: 'FEMALE',
      address: 'Jl. Mawar No. 45, Jakarta Selatan',
      phone: '081311223344',
      medicalRecNo: 'RM-2026-0002',
      satusehatId: 'P09876543-ID',
      createdAt: new Date().toISOString(),
    }
  ];

  static encounters: Encounter[] = [
    {
      id: 'enc-001',
      patientId: 'pat-001',
      doctorId: 'doc-001',
      queueNumber: 1,
      status: 'IN_PROGRESS',
      satusehatEncounterId: 'ENC-SATUSEHAT-9901',
      createdAt: new Date().toISOString(),
      patient: {
        nik: '3171012304900001',
        fullName: 'Ahmad Supardi',
        medicalRecNo: 'RM-2026-0001',
      },
      doctor: {
        fullName: 'dr. Budi Santoso, Sp.PD',
        sipNumber: 'SIP-449/123/2023',
      }
    },
    {
      id: 'enc-002',
      patientId: 'pat-002',
      doctorId: 'doc-001',
      queueNumber: 2,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
      patient: {
        nik: '3171025508950002',
        fullName: 'Siti Aminah',
        medicalRecNo: 'RM-2026-0002',
      },
      doctor: {
        fullName: 'dr. Budi Santoso, Sp.PD',
        sipNumber: 'SIP-449/123/2023',
      }
    }
  ];

  static medicalRecords: Record<string, any> = {};

  static syncLogs: SatusehatSyncLog[] = [
    {
      id: 'sync-1',
      resourceType: 'Encounter',
      resourceId: 'enc-001',
      status: 'SUCCESS',
      payload: { resourceType: 'Encounter', status: 'in-progress' },
      satusehatId: 'ENC-SATUSEHAT-9901',
      updatedAt: new Date().toISOString(),
    }
  ];
}
