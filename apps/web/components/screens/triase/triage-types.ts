import type { AllergyReviewStatus, ClinicalHistoryCategory, ClinicalHistoryStatus, MedicalRecord } from '@mitrafaskes/shared';

export type TriageHistoryDraft = {
  id?: string;
  category: ClinicalHistoryCategory;
  text: string;
  status: ClinicalHistoryStatus | '';
  onset: string;
  note: string;
};

export type TriageFormValues = {
  chiefComplaint: string;
  presentIllness: string;
  allergyReviewStatus: AllergyReviewStatus | '';
  allergyDetails: string;
  anamnesis: string;
  histories: TriageHistoryDraft[];
  systolic: string;
  diastolic: string;
  heartRate: string;
  temperature: string;
  weight: string;
  height: string;
  respiratoryRate: string;
  oxygenSaturation: string;
};

export function triageValuesFrom(record: MedicalRecord | null): TriageFormValues {
  const quantityFor = (codes: readonly string[]) => {
    const observation = (record?.observations ?? []).find((candidate) =>
      codes.includes(candidate.code.code),
    );
    return observation?.value.type === 'quantity'
      ? String(observation.value.value)
      : '';
  };
  return {
    chiefComplaint: record?.chiefComplaint ?? '',
    presentIllness: record?.presentIllness ?? '',
    allergyReviewStatus: record?.allergyReviewStatus ?? '',
    allergyDetails: record?.allergyDetails ?? '',
    anamnesis: record?.anamnesis ?? '',
    histories: (record?.histories ?? []).map((history) => ({
      id: history.id,
      category: history.category,
      text: history.text,
      status: history.status ?? '',
      onset: history.onset?.slice(0, 10) ?? '',
      note: history.note ?? '',
    })),
    systolic: record?.systolic === undefined ? '' : String(record.systolic),
    diastolic: record?.diastolic === undefined ? '' : String(record.diastolic),
    heartRate: record?.heartRate === undefined ? '' : String(record.heartRate),
    temperature: record?.temperature === undefined ? '' : String(record.temperature),
    weight: record?.weight === undefined ? '' : String(record.weight),
    height: record?.height === undefined ? '' : String(record.height),
    respiratoryRate: quantityFor(['9279-1']),
    oxygenSaturation: quantityFor(['2708-6']),
  };
}
