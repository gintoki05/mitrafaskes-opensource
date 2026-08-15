import type { ColumnDef } from '@tanstack/react-table';
import type { PractitionerSummary } from '@mitrafaskes/shared';
import { Edit3 } from 'lucide-react';
import { ActiveStatusBadge } from '@/components/ActiveStatusBadge';
import { Button } from '@/components/ui/button';
import { SatusehatActionGroup } from '@/components/satusehat/SatusehatActionGroup';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import { getIntegrationLinkage, getLatestIntegrationSync } from '@/lib/integrations';

type PractitionerColumnOptions = {
  canWrite: boolean;
  integrationEnabled: boolean;
  onLink: (practitioner: PractitionerSummary) => void;
  onEdit: (practitioner: PractitionerSummary) => void;
};

const satusehatColumn: ColumnDef<PractitionerSummary> = {
  id: 'satusehat',
  header: 'SATUSEHAT',
  enableSorting: false,
  cell: ({ row }) => {
    if (row.original.role === 'PETUGAS_PENDAFTARAN') {
      return <span className="text-xs text-muted-foreground">Tidak berlaku</span>;
    }

    return (
      <div className="space-y-1">
        <SatusehatLinkageBadge
          linkage={getIntegrationLinkage(row.original.integrations, 'SATUSEHAT')}
          resourceName={row.original.fullName}
        />
        {getLatestIntegrationSync(row.original.integrations, 'SATUSEHAT')?.status === 'FAILED' ? (
          <p className="max-w-44 text-[10px] font-semibold text-destructive" title={getLatestIntegrationSync(row.original.integrations, 'SATUSEHAT')?.errorMessage}>
            Sinkronisasi terakhir gagal
          </p>
        ) : null}
      </div>
    );
  },
};

export function getPractitionerColumns({
  canWrite,
  integrationEnabled,
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
            @{row.original.username} · {row.original.role === 'DOKTER' ? 'Dokter' : row.original.role === 'PETUGAS_PENDAFTARAN' ? 'Petugas pendaftaran' : 'Perawat'}
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
      cell: ({ row }) => {
        const locations =
          row.original.locations?.length > 0
            ? row.original.locations
            : row.original.location
              ? [row.original.location]
              : [];
        return locations.length > 0 ? (
          <div className="min-w-44 space-y-1 text-xs" title={locations.map((location) => location.name).join(', ')}>
            {locations.slice(0, 2).map((location) => (
              <div key={location.id}>
                <div className="font-semibold text-foreground">{location.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {location.code}
                </div>
              </div>
            ))}
            {locations.length > 2 ? (
              <div className="text-[10px] font-semibold text-primary">
                +{locations.length - 2} Location lain
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Belum ditetapkan</span>
        );
      },
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
        <ActiveStatusBadge active={row.original.active} />
      ),
    },
    ...(integrationEnabled ? [satusehatColumn] : []),
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1">
          {canWrite ? (
            <>
              {row.original.role !== 'PETUGAS_PENDAFTARAN' ? (
                <SatusehatActionGroup
                  resourceName={row.original.fullName}
                  onLink={() => onLink(row.original)}
                  linkDisabled={!row.original.nik}
                  linkDisabledReason="NIK wajib diisi untuk lookup Practitioner SATUSEHAT"
                />
              ) : null}
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
