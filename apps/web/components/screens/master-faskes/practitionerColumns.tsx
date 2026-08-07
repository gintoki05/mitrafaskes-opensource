import type { ColumnDef } from '@tanstack/react-table';
import type { PractitionerSummary } from '@mitrafaskes/shared';
import { Edit3, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SatusehatLinkageBadge } from './SatusehatLinkageBadge';

type PractitionerColumnOptions = {
  canWrite: boolean;
  onLink: (practitioner: PractitionerSummary) => void;
  onEdit: (practitioner: PractitionerSummary) => void;
};

export function getPractitionerColumns({
  canWrite,
  onLink,
  onEdit,
}: PractitionerColumnOptions): ColumnDef<PractitionerSummary>[] {
  return [
    {
      accessorKey: 'fullName',
      header: 'Tenaga kesehatan',
      cell: ({ row }) => (
        <div className="min-w-48">
          <div className="font-semibold text-foreground">{row.original.fullName}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            @{row.original.username} · {row.original.role === 'DOKTER' ? 'Dokter' : 'Perawat'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'nik',
      header: 'NIK',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.nik || 'Belum diisi'}
        </span>
      ),
    },
    {
      id: 'organization',
      header: 'Organization',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.organization ? (
          <div className="min-w-40 space-y-1 text-xs">
            <div className="font-semibold text-foreground">
              {row.original.organization.code}
            </div>
            <div className="text-muted-foreground">
              {row.original.organization.name}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Belum ditetapkan</span>
        ),
    },
    {
      id: 'location',
      header: 'Location',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.location ? (
          <div className="min-w-36 space-y-1 text-xs">
            <div className="font-semibold text-foreground">
              {row.original.location.code}
            </div>
            <div className="text-muted-foreground">
              {row.original.location.name}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Belum ditetapkan</span>
        ),
    },
    {
      id: 'license',
      header: 'Lisensi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>{row.original.sipNumber || 'SIP belum diisi'}</div>
          <div>{row.original.strNumber || 'STR belum diisi'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          className={
            row.original.active
              ? 'clinical-status-success border text-[10px] font-bold'
              : 'clinical-status-error border text-[10px] font-bold'
          }
        >
          {row.original.active ? 'AKTIF' : 'NONAKTIF'}
        </Badge>
      ),
    },
    {
      id: 'satusehat',
      header: 'SATUSEHAT',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="space-y-1">
          <SatusehatLinkageBadge
            linkage={row.original.satusehat}
            resourceName={row.original.fullName}
          />
          {row.original.satusehatSync?.status === 'FAILED' ? (
            <p className="max-w-44 text-[10px] font-semibold text-destructive" title={row.original.satusehatSync.errorMessage}>
              Sinkronisasi terakhir gagal
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1">
          {canWrite ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => onLink(row.original)}
                aria-label={`Sinkronkan SATUSEHAT untuk ${row.original.fullName}`}
                title="Sinkronkan SATUSEHAT"
                disabled={!row.original.nik}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => onEdit(row.original)}
                aria-label={`Edit profil ${row.original.fullName}`}
                title="Edit profil Practitioner"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];
}
