import type { RmeValidationIssue } from '@mitrafaskes/shared';
import type { MedicalRecordWithRelations } from './rme.mapper';

export function validateTriageCompletion(
  record: MedicalRecordWithRelations,
): RmeValidationIssue[] {
  const issues: RmeValidationIssue[] = [];
  if (!record.chiefComplaint?.trim()) {
    issues.push({
      code: 'TRIAGE_CHIEF_COMPLAINT_REQUIRED',
      field: 'chiefComplaint',
      section: 'anamnesis',
      message: 'Keluhan utama wajib diisi untuk menyelesaikan triase.',
    });
  }
  if (
    !record.allergyReviewStatus ||
    record.allergyReviewStatus === 'NOT_REVIEWED'
  ) {
    issues.push({
      code: 'TRIAGE_ALLERGY_REVIEW_REQUIRED',
      field: 'allergyReviewStatus',
      section: 'allergies',
      message:
        'Review alergi harus dipilih dan tidak boleh berstatus belum direview.',
    });
  }
  if (
    record.allergyReviewStatus === 'KNOWN' &&
    !record.allergyDetails?.trim()
  ) {
    issues.push({
      code: 'TRIAGE_ALLERGY_DETAILS_REQUIRED',
      field: 'allergyDetails',
      section: 'allergies',
      message: 'Detail alergi wajib diisi bila alergi diketahui.',
    });
  }

  const requiredVitals: Array<[keyof MedicalRecordWithRelations, string]> = [
    ['systolic', 'Tekanan darah sistolik wajib diisi.'],
    ['diastolic', 'Tekanan darah diastolik wajib diisi.'],
    ['heartRate', 'Nadi wajib diisi.'],
    ['temperature', 'Suhu tubuh wajib diisi.'],
  ];
  for (const [field, message] of requiredVitals) {
    const value = record[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({
        code: `TRIAGE_${String(field).toUpperCase()}_REQUIRED`,
        field: String(field),
        section: 'vitalSigns',
        message,
      });
    }
  }
  return issues;
}
