import type { ColumnDef } from "@tanstack/react-table";
import type {
  LocationSummary,
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import { Edit3, Link2, Power, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  locationModes,
  locationStatuses,
  locationTypes,
} from "./constants";
import { SatusehatLinkageBadge } from "./SatusehatLinkageBadge";

type LocationColumnOptions = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  onPreview: (location: LocationSummary) => void;
  onLink: (location: LocationSummary) => void;
  onEdit: (location: LocationSummary) => void;
  onToggleStatus: (location: LocationSummary) => void;
};

function labelFor<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function getLocationColumns({
  canWrite,
  organizations,
  serviceUnits,
  onPreview,
  onLink,
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
      id: "serviceUnit",
      header: "Unit layanan",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {serviceUnits.find((unit) => unit.id === row.original.serviceUnitId)
            ?.name ?? "Tidak ditetapkan"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status location",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.status === "ACTIVE"
              ? "border-success/35 text-success"
              : row.original.status === "SUSPENDED"
                ? "border-warning/35 text-warning"
                : "border-destructive/35 text-destructive"
          }
        >
          {labelFor(locationStatuses, row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "active",
      header: "Data",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.active
              ? "clinical-status-success border text-[10px] font-bold"
              : "clinical-status-error border text-[10px] font-bold"
          }
        >
          {row.original.active ? "AKTIF" : "NONAKTIF"}
        </Badge>
      ),
    },
    {
      id: "satusehat",
      header: "SATUSEHAT",
      enableSorting: false,
      cell: ({ row }) => (
        <SatusehatLinkageBadge
          linkage={row.original.satusehat}
          resourceName={row.original.name}
        />
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onPreview(row.original)}
            aria-label={`Sinkronkan SATUSEHAT ${row.original.name}`}
            title="Sinkronkan SATUSEHAT"
            className="text-primary hover:bg-primary/10 hover:text-primary focus-visible:border-primary/40 focus-visible:ring-primary/20"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {canWrite ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => onLink(row.original)}
                aria-label={`Hubungkan SATUSEHAT untuk ${row.original.name}`}
                title="Hubungkan Location SATUSEHAT"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
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
