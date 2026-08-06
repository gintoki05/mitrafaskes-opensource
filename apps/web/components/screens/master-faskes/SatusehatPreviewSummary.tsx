import { Badge } from "@/components/ui/badge";
import {
  buildSatusehatPreviewSections,
  readSatusehatPreviewResourceType,
} from "./satusehatPreviewData";

type SatusehatPreviewSummaryProps = {
  payload: unknown;
  externalResourceId?: string;
};

export function formatSatusehatOperation(operation?: string): string {
  switch (operation) {
    case "CREATE":
      return "Buat data baru";
    case "UPDATE":
      return "Perbarui data";
    case "LINK_EXISTING_ROOT":
      return "Hubungkan fasilitas induk";
    default:
      return "Periksa data";
  }
}

export function SatusehatPreviewSummary({
  payload,
  externalResourceId,
}: SatusehatPreviewSummaryProps) {
  const sections = buildSatusehatPreviewSections(payload, externalResourceId);
  const resourceType = readSatusehatPreviewResourceType(payload);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/[0.04] p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Periksa data sebelum disinkronkan
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pastikan informasi utama sudah benar sebelum dikirim ke SATUSEHAT.
          </p>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {resourceType}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-background">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <section
              key={section.title}
              className="border-t border-border p-4 first:border-t-0"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <SectionIcon className="h-4 w-4" aria-hidden="true" />
                <h3>{section.title}</h3>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div
                    key={field.label}
                    className={field.wide ? "sm:col-span-2" : undefined}
                  >
                    <dt className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd
                      className={
                        field.mono
                          ? "mt-1 break-words font-mono text-xs text-foreground"
                          : "mt-1 break-words text-sm text-foreground"
                      }
                    >
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
