import { Building2, CircleDot, Layers3, MapPin, type LucideIcon } from "lucide-react";
import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenState } from "@/components/ScreenState";

type MasterFaskesStructureProps = {
  loading: boolean;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  locations: LocationSummary[];
};

type ResourceSummary = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

function ResourceCard({
  title,
  emptyLabel,
  icon: Icon,
  items,
}: {
  title: string;
  emptyLabel: string;
  icon: LucideIcon;
  items: ResourceSummary[];
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 text-xs"
            >
              <span className="min-w-0">
                <span className="font-mono text-[10px] text-primary">
                  {item.code}
                </span>{" "}
                <span className="font-semibold text-foreground">
                  {item.name}
                </span>
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function OrganizationStructureItem({
  organization,
  organizations,
  serviceUnits,
  locations,
}: {
  organization: OrganizationSummary;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  locations: LocationSummary[];
}) {
  const childOrganizations = organizations.filter(
    (child) => child.parentId === organization.id,
  );
  const organizationUnits = serviceUnits.filter(
    (unit) => unit.organizationId === organization.id,
  );
  const organizationLocations = locations.filter(
    (location) => location.organizationId === organization.id,
  );

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-foreground">
                {organization.name}
              </strong>
              <Badge variant="outline" className="font-mono text-[10px]">
                {organization.code}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {organization.type === "HEALTHCARE_FACILITY"
                ? "Faskes / organisasi induk"
                : "Sub-organisasi"}
              {organization.addressText
                ? ` · ${organization.addressText}`
                : ""}
            </div>
          </div>
        </div>
        <Badge
          className={
            organization.active
              ? "clinical-status-success border text-[10px] font-bold"
              : "clinical-status-error border text-[10px] font-bold"
          }
        >
          {organization.active ? "AKTIF" : "NONAKTIF"}
        </Badge>
      </div>
      {childOrganizations.length > 0 ? (
        <div className="ml-12 space-y-1 border-l border-dashed border-border pl-4 text-xs text-muted-foreground">
          {childOrganizations.map((child) => (
            <div key={child.id} className="flex items-center gap-2">
              <CircleDot className="h-3 w-3 text-primary" />
              {child.name}{" "}
              <span className="font-mono text-[10px]">({child.code})</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="ml-0 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <ResourceCard
          title="Unit layanan"
          emptyLabel="Belum ada unit layanan."
          icon={Layers3}
          items={organizationUnits}
        />
        <ResourceCard
          title="Location fisik"
          emptyLabel="Belum ada location."
          icon={MapPin}
          items={organizationLocations}
        />
      </div>
    </div>
  );
}

export function MasterFaskesStructure({
  loading,
  organizations,
  serviceUnits,
  locations,
}: MasterFaskesStructureProps) {
  const activeOrganizationCount = organizations.filter(
    (organization) => organization.active,
  ).length;
  const rootOrganizations = organizations.filter(
    (organization) => !organization.parentId,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border">
        <div>
          <CardTitle className="text-sm font-bold">
            Struktur master saat ini
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Organization/faskes → unit layanan → location fisik.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 text-xs font-semibold text-primary"
        >
          {activeOrganizationCount} aktif
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4">
            <ScreenState
              kind="loading"
              title="Memuat struktur master"
              description="Organisasi, unit, dan location sedang diambil."
              compact
            />
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-4">
            <ScreenState
              kind="empty"
              title="Belum ada organisasi"
              description="Tambahkan organisasi/faskes induk untuk mulai membangun struktur master."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rootOrganizations.map((organization) => (
              <OrganizationStructureItem
                key={organization.id}
                organization={organization}
                organizations={organizations}
                serviceUnits={serviceUnits}
                locations={locations}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
