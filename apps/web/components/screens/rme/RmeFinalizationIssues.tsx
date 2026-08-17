import { AlertTriangle } from 'lucide-react';
import type {
  RmeValidationIssue,
  RmeValidationSection,
} from '@mitrafaskes/shared';
import { rmeIssuesForSection } from './rme-finalization-issues';

const sectionLabels: Record<RmeValidationSection, string> = {
  profile: 'Profil layanan',
  encounter: 'Konteks Encounter',
  anamnesis: 'Anamnesis',
  allergies: 'Review alergi',
  vitalSigns: 'Tanda vital',
  physicalExam: 'Pemeriksaan fisik',
  diagnoses: 'Diagnosis',
  prescriptions: 'Resep',
  plan: 'Edukasi dan rencana',
  authorization: 'Kewenangan klinisi',
};

export function RmeSectionIssues({
  issues,
  section,
}: {
  issues: RmeValidationIssue[];
  section: RmeValidationSection;
}) {
  const sectionIssues = rmeIssuesForSection(issues, section);
  if (sectionIssues.length === 0) return null;

  return (
    <div
      role="alert"
      className="mt-3 rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Periksa {sectionLabels[section]}
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {sectionIssues.map((entry, index) => (
          <li key={`${entry.code}-${entry.field}-${index}`}>{entry.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function RmeGlobalFinalizationIssues({
  issues,
}: {
  issues: RmeValidationIssue[];
}) {
  const globalSections: RmeValidationSection[] = [
    'profile',
    'encounter',
    'authorization',
  ];
  const visible = issues.filter((entry) => globalSections.includes(entry.section));
  if (visible.length === 0) return null;

  return (
    <div data-rme-section={visible[0].section} tabIndex={-1}>
      {globalSections.map((section) => (
        <RmeSectionIssues key={section} issues={visible} section={section} />
      ))}
    </div>
  );
}
