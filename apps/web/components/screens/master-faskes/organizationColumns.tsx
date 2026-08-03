import type { ColumnDef } from "@tanstack/react-table";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3, Eye, Link2, Power } from "lucide-react";
import { organizationTypes } from "./constants";

type OrganizationColumnOptions = {
  canWrite: boolean;
  organizations: OrganizationSummary[];
  onPreview: (organization: OrganizationSummary) => void;
  onLink: (organization: OrganizationSummary) => void;
  onEdit: (organization: OrganizationSummary) => void;
  onToggleStatus: (organization: OrganizationSummary) => void;
};

function labelForType(type: OrganizationSummary["type"]): string {
  return (
    organizationTypes.find((option) => option.value === type)?.label ?? type
  );
}

export function getOrganizationColumns({
  canWrite,
  organizations,
  onPreview,
  onLink,
  onEdit,
  onToggleStatus,
}: OrganizationColumnOptions): ColumnDef<OrganizationSummary>[] {
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
      header: "Nama organisasi / faskes",
      cell: ({ row }) => (
        <div className="min-w-48">
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {row.original.addressText || "Alamat belum diisi"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Jenis",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {labelForType(row.original.type)}
        </span>
      ),
    },
    {
      id: "parent",
      header: "Organisasi induk",
      enableSorting: false,
      cell: ({ row }) => {
        const parent = organizations.find(
          (organization) => organization.id === row.original.parentId,
        );
        return (
          <span className="text-xs text-muted-foreground">
            {parent ? parent.name : "Induk / root"}
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
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => onPreview(row.original)}
            aria-label={`Preview SATUSEHAT untuk ${row.original.name}`}
            title="Preview SATUSEHAT"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {canWrite ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => onLink(row.original)}
                aria-label={`Hubungkan SATUSEHAT untuk ${row.original.name}`}
                title="Hubungkan Organization SATUSEHAT"
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
              >
                <Power className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];
}

