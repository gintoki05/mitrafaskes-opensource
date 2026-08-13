import { ListChecks } from 'lucide-react';
import type { RmeValidationIssue } from '@mitrafaskes/shared';
import type { UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { SelectField } from '@/components/screens/master-faskes/FormField';
import type { RmeFormValues } from './rme-form-schema';
import { RmeSectionIssues } from './RmeFinalizationIssues';

export function RmeCarePlanSection({
  register,
  disposition,
  onDispositionChange,
  issues,
}: {
  register: UseFormRegister<RmeFormValues>;
  disposition: RmeFormValues['disposition'];
  onDispositionChange: (value: RmeFormValues['disposition']) => void;
  issues: RmeValidationIssue[];
}) {
  return (
    <Card data-rme-section="plan" tabIndex={-1}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ListChecks className="h-4 w-4 text-primary" />
          5. Edukasi, rencana, dan disposisi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="education">Edukasi atau instruksi pasien</FieldLabel>
          <textarea {...register('education')} id="education" rows={2} className="clinical-field w-full p-3 text-xs" />
        </Field>
        <Field>
          <FieldLabel htmlFor="carePlan">Rencana terapi dan tindak lanjut</FieldLabel>
          <textarea {...register('carePlan')} id="carePlan" rows={3} className="clinical-field w-full p-3 text-xs" />
        </Field>
        <Field>
          <FieldLabel htmlFor="disposition">Disposisi pasien</FieldLabel>
          <SelectField
            id="disposition"
            value={disposition}
            onChange={(value) => onDispositionChange(value as RmeFormValues['disposition'])}
            aria-invalid={issues.some((entry) => entry.field === 'disposition')}
          >
            <option value="">Pilih disposisi</option>
            <option value="HOME">Pulang</option>
            <option value="REFERRED">Dirujuk</option>
            <option value="ADMITTED">Rawat inap</option>
            <option value="OTHER">Lainnya</option>
          </SelectField>
        </Field>
        <RmeSectionIssues issues={issues} section="plan" />
      </CardContent>
    </Card>
  );
}
