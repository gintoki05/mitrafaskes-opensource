import { Building2, Layers3, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MasterFaskesSummaryProps = {
  organizationCount: number;
  serviceUnitCount: number;
  locationCount: number;
};

const summaryItems = [
  { key: "organizations", label: "Organisasi / faskes", icon: Building2 },
  { key: "serviceUnits", label: "Unit layanan / poli", icon: Layers3 },
  { key: "locations", label: "Location / ruangan", icon: MapPin },
] as const;

export function MasterFaskesSummary({
  organizationCount,
  serviceUnitCount,
  locationCount,
}: MasterFaskesSummaryProps) {
  const values = {
    organizations: organizationCount,
    serviceUnits: serviceUnitCount,
    locations: locationCount,
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
      {summaryItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} size="sm">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-2xl font-bold text-foreground">
                  {values[item.key]}
                </div>
              </div>
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
