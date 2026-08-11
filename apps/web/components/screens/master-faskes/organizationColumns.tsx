import type { ColumnDef } from "@tanstack/react-table";
import type { OrganizationSummary } from "@mitrafaskes/shared";
import { ActiveStatusBadge } from "@/components/ActiveStatusBadge";
import { Button } from "@/components/ui/button";
import { Edit3, Power } from "lucide-react";
import { organizationTypes } from "./constants";
import { OrganizationHierarchyBadge } from "./OrganizationHierarchyBadge";
import { SatusehatLinkageBadge } from "@/components/satusehat/SatusehatLinkageBadge";
import { SatusehatActionGroup } from "@/components/satusehat/SatusehatActionGroup";

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
          <div className="font-semibold text-foreground">
            {row.original.name}
          </div>
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
        <div className="flex flex-wrap items-center gap-1.5">
          <OrganizationHierarchyBadge isRoot={!row.original.parentId} />
          <span className="text-xs text-muted-foreground">
            {labelForType(row.original.type)}
          </span>
        </div>
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
        <ActiveStatusBadge active={row.original.active} />
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
        <div className="flex min-w-max flex-nowrap items-center justify-end gap-1">
          <SatusehatActionGroup
            resourceName={row.original.name}
            onSync={() => onPreview(row.original)}
            className="flex-nowrap"
            onLink={
              canWrite && !row.original.satusehat
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
          ) : null}
        </div>
      ),
    },
  ];
}
