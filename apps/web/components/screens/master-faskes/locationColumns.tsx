import type { ColumnDef } from "@tanstack/react-table";
import type {
  LocationSummary,
  OrganizationSummary,
} from "@mitrafaskes/shared";
import { Edit3, Power, UserRoundPlus } from "lucide-react";
import { ActiveStatusBadge } from "@/components/ActiveStatusBadge";
import { Button } from "@/components/ui/button";
import { SatusehatActionGroup } from "@/components/satusehat/SatusehatActionGroup";
import {
  locationModes,
  locationTypes,
} from "./constants";
import { LocationOperationalStatusBadge } from "./LocationOperationalStatusBadge";
import { SatusehatLinkageBadge } from "@/components/satusehat/SatusehatLinkageBadge";
import { getIntegrationLinkage } from "@/lib/integrations";

type LocationColumnOptions = {
  canWrite: boolean;
  integrationEnabled: boolean;
  organizations: OrganizationSummary[];
  onPreview: (location: LocationSummary) => void;
  onLink: (location: LocationSummary) => void;
  onAssignDoctors: (location: LocationSummary) => void;
  onEdit: (location: LocationSummary) => void;
  onToggleStatus: (location: LocationSummary) => void;
};

function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

const satusehatColumn: ColumnDef<LocationSummary> = {
  id: "satusehat",
  header: "SATUSEHAT",
  enableSorting: false,
  cell: ({ row }) => (
    <SatusehatLinkageBadge
      linkage={getIntegrationLinkage(row.original.integrations, "SATUSEHAT")}
      resourceName={row.original.name}
    />
  ),
};

export function getLocationColumns({
  canWrite,
  integrationEnabled,
  organizations,
  onPreview,
  onLink,
  onAssignDoctors,
  onEdit,
  onToggleStatus,
}: LocationColumnOptions): ColumnDef<LocationSummary>[] {
  return [
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama location",
      cell: ({ row }) => (
        <div className="min-w-44">
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {labelFor(locationTypes, row.original.type)} -{" "}
            {labelFor(locationModes, row.original.mode)}
          </div>
        </div>
      ),
    },
    {
      id: "organization",
      header: "Organisasi induk",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {organizations.find(
            (organization) => organization.id === row.original.organizationId,
          )?.name ?? "Organisasi tidak ditemukan"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status location",
      enableSorting: false,
      cell: ({ row }) => (
        <LocationOperationalStatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: "active",
      header: "Status data",
      cell: ({ row }) => (
        <ActiveStatusBadge active={row.original.active} />
      ),
    },
    ...(integrationEnabled ? [satusehatColumn] : []),
    {
      id: "actions",
      header: "Aksi",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1">
          <SatusehatActionGroup
            resourceName={row.original.name}
            onSync={() => onPreview(row.original)}
            onLink={
              canWrite && !getIntegrationLinkage(row.original.integrations, "SATUSEHAT")
                ? () => onLink(row.original)
                : undefined
            }
          />
          {canWrite ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => onAssignDoctors(row.original)}
                aria-label={`Tugaskan dokter ke ${row.original.name}`}
                title="Tugaskan dokter"
              >
                <UserRoundPlus className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => onEdit(row.original)}
                aria-label={`Edit ${row.original.name}`}
                title="Edit"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onToggleStatus(row.original)}
                aria-label={`${row.original.active ? "Nonaktifkan" : "Aktifkan"} ${row.original.name}`}
                title={row.original.active ? "Nonaktifkan" : "Aktifkan"}
                className={
                  row.original.active
                    ? "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
                    : "text-success hover:bg-success/10 hover:text-success focus-visible:border-success/40 focus-visible:ring-success/20"
                }
              >
                <Power className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Hanya baca</span>
          )}
        </div>
      ),
    },
  ];
}
