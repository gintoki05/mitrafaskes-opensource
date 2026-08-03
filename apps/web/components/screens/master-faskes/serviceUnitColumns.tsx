import type { ColumnDef } from "@tanstack/react-table";
import type {
  OrganizationSummary,
  ServiceUnitSummary,
} from "@mitrafaskes/shared";
import { Edit3, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serviceUnitTypes } from "./constants";

type ServiceUnitColumnOptions = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  serviceUnits: ServiceUnitSummary[];
  onEdit: (serviceUnit: ServiceUnitSummary) => void;
  onToggleStatus: (serviceUnit: ServiceUnitSummary) => void;
};

function labelForType(type: ServiceUnitSummary["type"]): string {
  return serviceUnitTypes.find((option) => option.value === type)?.label ?? type;
}

export function getServiceUnitColumns({
  canWrite,
  organizations,
  serviceUnits,
  onEdit,
  onToggleStatus,
}: ServiceUnitColumnOptions): ColumnDef<ServiceUnitSummary>[] {
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
      header: "Nama unit layanan",
      cell: ({ row }) => (
        <div className="min-w-48">
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {labelForType(row.original.type)}
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
      id: "parent",
      header: "Unit induk",
      enableSorting: false,
      cell: ({ row }) => {
        const parent = serviceUnits.find(
          (unit) => unit.id === row.original.parentId,
        );
        return (
          <span className="text-xs text-muted-foreground">
            {parent ? parent.name : "Unit utama"}
          </span>
        );
      },
    },
    {
      accessorKey: "active",
      header: "Status",
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
      id: "actions",
      header: "Aksi",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1">
          {canWrite ? (
            <>
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

