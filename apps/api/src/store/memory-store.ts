export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  queueNumber: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  satusehatEncounterId?: string;
  createdAt: string;
  patient?: {
    nik?: string;
    fullName: string;
    medicalRecNo: string;
  };
  doctor?: {
    fullName: string;
    sipNumber?: string;
  };
}

export interface SatusehatSyncLog {
  id: string;
  resourceType:
    | 'Organization'
    | 'Encounter'
    | 'Condition'
    | 'Observation'
    | 'MedicationRequest';
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload: any;
  satusehatId?: string;
  errorMessage?: string;
  updatedAt: string;
}

export class MemoryStore {
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
        medicalRecNo: 'RM-2026-000001',
      },
      doctor: {
        fullName: 'dr. Budi Santoso, Sp.PD',
        sipNumber: 'SIP-449/123/2023',
      },
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
        medicalRecNo: 'RM-2026-000002',
      },
      doctor: {
        fullName: 'dr. Budi Santoso, Sp.PD',
        sipNumber: 'SIP-449/123/2023',
      },
    },
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
    },
  ];
}
