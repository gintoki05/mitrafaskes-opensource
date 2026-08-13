import {
  AllergyReviewStatus,
  MedicalRecordServiceProfile,
  OUTPATIENT_GENERAL_VALIDATION_PROFILE,
  type RmePreflightResult,
  type RmeValidationIssue,
  type RmeValidationSection,
} from '@mitrafaskes/shared';

export type FinalizationValidationInput = {
  serviceProfile: string;
  validationProfile: string;
  chiefComplaint: string | null;
  presentIllness: string | null;
  allergyReviewStatus: string | null;
  allergyDetails: string | null;
  physicalExam: string | null;
  education: string | null;
  carePlan: string | null;
  disposition: string | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  diagnoses: Array<{ icd10Code: string; isPrimary: boolean }>;
  prescriptions: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    quantity: number;
  }>;
  encounter: {
    status: string;
    patientId: string;
    doctorId: string;
    organizationId: string;
    locationId: string;
    doctor: {
      active: boolean;
      role: string;
      organizationId: string | null;
      locationId: string | null;
      locationAssignments: Array<{ locationId: string }>;
    };
  };
};

type ProfileRule = (record: FinalizationValidationInput) => RmeValidationIssue[];

const issue = (
  section: RmeValidationSection,
  field: string,
  code: string,
  message: string,
): RmeValidationIssue => ({ section, field, code, message });

const requiredText = (
  section: RmeValidationSection,
  field: keyof FinalizationValidationInput,
  message: string,
): ProfileRule => (record) =>
  typeof record[field] === 'string' && record[field].trim().length > 0
    ? []
    : [issue(section, String(field), 'REQUIRED', message)];

const contextRules: ProfileRule[] = [
  (record) => record.encounter.status === 'IN_PROGRESS'
    ? []
    : [issue('encounter', 'status', 'ENCOUNTER_NOT_IN_PROGRESS', 'Encounter harus berstatus IN_PROGRESS.')],
  ...([
    ['patientId', 'Pasien Encounter tidak tersedia.'],
    ['organizationId', 'Organisasi layanan tidak tersedia.'],
    ['locationId', 'Lokasi layanan tidak tersedia.'],
    ['doctorId', 'Klinisi Encounter tidak tersedia.'],
  ] as const).map(([field, message]): ProfileRule => (record) =>
    record.encounter[field]
      ? []
      : [issue('encounter', field, 'REQUIRED', message)]),
  (record) => {
    const doctor = record.encounter.doctor;
    const assignedToLocation = doctor.locationAssignments.length > 0
      ? doctor.locationAssignments.some(
          (assignment) => assignment.locationId === record.encounter.locationId,
        )
      : doctor.locationId === record.encounter.locationId;
    return doctor.active &&
      doctor.role === 'DOKTER' &&
      doctor.organizationId === record.encounter.organizationId &&
      assignedToLocation
      ? []
      : [issue(
          'authorization',
          'doctorId',
          'CLINICIAN_CONTEXT_INVALID',
          'Penugasan dokter pada organisasi dan lokasi layanan tidak lagi valid.',
        )];
  },
];

const outpatientGeneralRules: ProfileRule[] = [
  ...contextRules,
  requiredText('anamnesis', 'chiefComplaint', 'Keluhan utama wajib diisi.'),
  requiredText('anamnesis', 'presentIllness', 'Riwayat penyakit sekarang wajib diisi.'),
  (record) => record.allergyReviewStatus &&
    record.allergyReviewStatus !== AllergyReviewStatus.NOT_REVIEWED
    ? []
    : [issue(
        'allergies',
        'allergyReviewStatus',
        'ALLERGY_REVIEW_REQUIRED',
        'Status review alergi harus dipilih secara eksplisit.',
      )],
  (record) => record.allergyReviewStatus !== AllergyReviewStatus.KNOWN ||
    Boolean(record.allergyDetails?.trim())
    ? []
    : [issue(
        'allergies',
        'allergyDetails',
        'ALLERGY_DETAILS_REQUIRED',
        'Zat atau produk penyebab alergi wajib dicatat ketika alergi diketahui.',
      )],
  ...([
    ['systolic', 'Tekanan darah sistolik wajib diisi.'],
    ['diastolic', 'Tekanan darah diastolik wajib diisi.'],
    ['heartRate', 'Denyut nadi wajib diisi.'],
    ['temperature', 'Suhu tubuh wajib diisi.'],
  ] as const).map(([field, message]): ProfileRule => (record) =>
    record[field] === null
      ? [issue('vitalSigns', field, 'REQUIRED', message)]
      : []),
  requiredText('physicalExam', 'physicalExam', 'Pemeriksaan fisik wajib diisi.'),
  (record) => record.diagnoses.filter((diagnosis) => diagnosis.isPrimary).length === 1
    ? []
    : [issue(
        'diagnoses',
        'diagnoses',
        'PRIMARY_DIAGNOSIS_REQUIRED',
        'RME final wajib mempunyai tepat satu diagnosis utama.',
      )],
  (record) => record.diagnoses.every((diagnosis) => diagnosis.icd10Code.trim())
    ? []
    : [issue('diagnoses', 'diagnoses', 'DIAGNOSIS_CODE_REQUIRED', 'Setiap diagnosis wajib memiliki kode ICD-10.')],
  (record) => record.prescriptions.flatMap((prescription, index) => {
    const issues: RmeValidationIssue[] = [];
    if (!prescription.medicineName.trim()) {
      issues.push(issue('prescriptions', `prescriptions.${index}.medicineName`, 'MEDICATION_REQUIRED', 'Identitas obat wajib diisi.'));
    }
    if (!prescription.dosage.trim() || !prescription.frequency.trim() || prescription.quantity < 1) {
      issues.push(issue('prescriptions', `prescriptions.${index}.dosage`, 'DOSAGE_REQUIRED', 'Dosis, frekuensi, dan jumlah obat harus dapat dipahami.'));
    }
    return issues;
  }),
  requiredText('plan', 'education', 'Edukasi atau instruksi pasien wajib diisi.'),
  requiredText('plan', 'carePlan', 'Rencana terapi atau tindak lanjut wajib diisi.'),
  (record) => record.disposition
    ? []
    : [issue('plan', 'disposition', 'DISPOSITION_REQUIRED', 'Disposisi pasien wajib dipilih.')],
];

const profiles: Record<string, {
  serviceProfile: MedicalRecordServiceProfile;
  rules: ProfileRule[];
}> = {
  [OUTPATIENT_GENERAL_VALIDATION_PROFILE]: {
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    rules: outpatientGeneralRules,
  },
};

export function validateFinalization(
  record: FinalizationValidationInput,
): RmePreflightResult {
  const profile = profiles[record.validationProfile];
  if (!profile || profile.serviceProfile !== record.serviceProfile) {
    return {
      ready: false,
      serviceProfile: record.serviceProfile,
      validationProfile: record.validationProfile,
      issues: [issue(
        'profile',
        'serviceProfile',
        'RME_PROFILE_MISMATCH',
        'Profil layanan dan validation profile RME tidak konsisten atau tidak didukung.',
      )],
    };
  }

  const issues = profile.rules.flatMap((rule) => rule(record));
  return {
    ready: issues.length === 0,
    serviceProfile: record.serviceProfile,
    validationProfile: record.validationProfile,
    issues,
  };
}
