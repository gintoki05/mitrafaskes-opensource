import { ClipboardCheck, FileText, ShieldCheck } from 'lucide-react';
import type { RmeValidationIssue } from '@mitrafaskes/shared';
import type { UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { SelectField } from '@/components/screens/master-faskes/FormField';
import type { RmeFormValues } from './rme-form-schema';
import { RmeSectionIssues } from './RmeFinalizationIssues';

type Props = {
  register: UseFormRegister<RmeFormValues>;
  allergyReviewStatus: RmeFormValues['allergyReviewStatus'];
  onAllergyReviewChange: (value: RmeFormValues['allergyReviewStatus']) => void;
  issues: RmeValidationIssue[];
};

export function RmeAssessmentSections({
  register,
  allergyReviewStatus,
  onAllergyReviewChange,
  issues,
}: Props) {
  return (
    <>
      <Card data-rme-section="anamnesis" tabIndex={-1}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            1. Anamnesis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="chiefComplaint">Keluhan utama</FieldLabel>
            <textarea
              {...register('chiefComplaint')}
              id="chiefComplaint"
              rows={2}
              className="clinical-field w-full p-3 text-xs"
              placeholder="Keluhan utama pasien"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="presentIllness">Riwayat penyakit sekarang</FieldLabel>
            <textarea
              {...register('presentIllness')}
              id="presentIllness"
              rows={3}
              className="clinical-field w-full p-3 text-xs"
              placeholder="Kronologi, onset, durasi, dan gejala terkait"
            />
          </Field>
          <RmeSectionIssues issues={issues} section="anamnesis" />
        </CardContent>
      </Card>

      <Card data-rme-section="allergies" tabIndex={-1}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Review alergi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="allergyReviewStatus">Status review alergi</FieldLabel>
            <SelectField
              id="allergyReviewStatus"
              value={allergyReviewStatus}
              onChange={(value) => onAllergyReviewChange(value as RmeFormValues['allergyReviewStatus'])}
              aria-invalid={issues.some((entry) => entry.section === 'allergies')}
            >
              <option value="">Pilih hasil review</option>
              <option value="NONE_KNOWN">Tidak ada alergi yang diketahui</option>
              <option value="KNOWN">Alergi diketahui dan telah direview</option>
              <option value="NOT_REVIEWED">Belum direview</option>
            </SelectField>
          </Field>
          <Field className="mt-4">
            <FieldLabel htmlFor="allergyDetails">Detail alergi yang diketahui</FieldLabel>
            <textarea
              {...register('allergyDetails')}
              id="allergyDetails"
              rows={2}
              className="clinical-field w-full p-3 text-xs"
              placeholder="Isi zat/produk dan reaksi bila status alergi diketahui"
            />
          </Field>
          <RmeSectionIssues issues={issues} section="allergies" />
        </CardContent>
      </Card>

    </>
  );
}

export function RmePhysicalExamSection({
  register,
  issues,
}: Pick<Props, 'register' | 'issues'>) {
  return (
    <Card data-rme-section="physicalExam" tabIndex={-1}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Pemeriksaan fisik
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="physicalExam">Temuan pemeriksaan</FieldLabel>
          <textarea
            {...register('physicalExam')}
            id="physicalExam"
            rows={3}
            className="clinical-field w-full p-3 text-xs"
            placeholder="Keadaan umum dan temuan pemeriksaan yang dipilih klinisi"
          />
        </Field>
        <RmeSectionIssues issues={issues} section="physicalExam" />
      </CardContent>
    </Card>
  );
}
