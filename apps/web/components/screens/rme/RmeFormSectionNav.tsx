const formSections = [
  { id: 'rme-section-anamnesis', label: 'Anamnesis' },
  { id: 'rme-section-allergies', label: 'Alergi' },
  { id: 'rme-section-clinical-history', label: 'Riwayat klinis' },
  { id: 'rme-section-vital-signs', label: 'Tanda vital' },
  { id: 'rme-section-physical-exam', label: 'Pemeriksaan fisik' },
  { id: 'rme-section-observations', label: 'Observasi' },
  { id: 'rme-section-diagnosis', label: 'Diagnosis' },
  { id: 'rme-section-prescriptions', label: 'Resep obat' },
  { id: 'rme-section-plan', label: 'Edukasi & rencana' },
] as const;

export function RmeFormSectionNav() {
  return (
    <nav
      aria-label="Bagian form pemeriksaan"
      className="min-w-0 lg:sticky lg:top-6"
    >
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        Bagian pemeriksaan
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {formSections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="block shrink-0 rounded-[var(--radius-control)] px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 lg:px-2"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
