'use client';

import { useMemo, useState } from 'react';
import type { LocationSummary, PractitionerSummary } from '@mitrafaskes/shared';
import { AlertTriangle, Check, Search, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenState } from '@/components/ScreenState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { usePractitioners } from '@/hooks/usePractitioners';
import { MasterFaskesDialog } from './MasterFaskesDialog';

type LocationPractitionerAssignmentDialogProps = {
  open: boolean;
  location: LocationSummary | null;
  canWrite: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

export function LocationPractitionerAssignmentDialog({
  open,
  location,
  canWrite,
  onClose,
  onSaved,
}: LocationPractitionerAssignmentDialogProps) {
  if (!open || !location) return null;

  return (
    <MasterFaskesDialog
      open
      label={`Tugaskan dokter ke ${location.name}`}
      onClose={onClose}
      className="max-w-2xl"
    >
      <LocationPractitionerAssignmentContent
        key={location.id}
        location={location}
        canWrite={canWrite}
        onClose={onClose}
        onSaved={onSaved}
      />
    </MasterFaskesDialog>
  );
}

function LocationPractitionerAssignmentContent({
  location,
  canWrite,
  onClose,
  onSaved,
}: Omit<LocationPractitionerAssignmentDialogProps, 'open' | 'location'> & {
  location: LocationSummary;
}) {
  const query = useMemo(
    () => ({
      active: true,
      organizationId: location.organizationId,
      role: 'DOKTER' as const,
      page: 1,
      pageSize: 100,
      sort: 'name' as const,
      direction: 'asc' as const,
    }),
    [location.organizationId],
  );
  const { items, loading, error, update } = usePractitioners(query);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const visiblePractitioners = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID');
    if (!normalizedSearch) return items;
    return items.filter((practitioner) =>
      `${practitioner.fullName} ${practitioner.username} ${practitioner.sipNumber ?? ''}`
        .toLocaleLowerCase('id-ID')
        .includes(normalizedSearch),
    );
  }, [items, search]);

  const isSelected = (practitioner: PractitionerSummary) =>
    Object.prototype.hasOwnProperty.call(draft, practitioner.id)
      ? draft[practitioner.id]
      : isAssignedToLocation(practitioner, location.id);
  const selectedCount = items.filter(isSelected).length;
  const allVisibleSelected =
    visiblePractitioners.length > 0 && visiblePractitioners.every(isSelected);
  const someVisibleSelected =
    visiblePractitioners.some(isSelected) && !allVisibleSelected;

  const toggleAllVisible = (checked: boolean) => {
    setDraft((current) => {
      const next = { ...current };
      for (const practitioner of visiblePractitioners) {
        next[practitioner.id] = checked;
      }
      return next;
    });
  };

  const save = async () => {
    if (!canWrite || saving) return;
    const changed = items.filter(
      (practitioner) =>
        isSelected(practitioner) !==
        isAssignedToLocation(practitioner, location.id),
    );
    if (changed.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      changed.map((practitioner) => {
        const currentLocationIds = getAssignedLocationIds(practitioner);
        const nextLocationIds = isSelected(practitioner)
          ? [...new Set([...currentLocationIds, location.id])]
          : currentLocationIds.filter((locationId) => locationId !== location.id);
        return update(practitioner.id, { locationIds: nextLocationIds });
      }),
    );
    const failed = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failed.length > 0) {
      toast.error('Assignment dokter belum sepenuhnya tersimpan', {
        description: `${failed.length} perubahan gagal. Periksa koneksi lalu coba lagi.`,
        duration: 7000,
      });
      setSaving(false);
      return;
    }

    toast.success(`${changed.length} assignment dokter diperbarui.`);
    try {
      await onSaved?.();
      onClose();
    } catch (refreshError) {
      toast.error('Assignment tersimpan, tetapi daftar belum dimuat ulang', {
        description:
          refreshError instanceof Error
            ? refreshError.message
            : 'Tutup dialog lalu buka kembali untuk melihat data terbaru.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
          Dokter di Location
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{location.name}</strong>{' '}
          <span className="font-mono">({location.code})</span> · {selectedCount}{' '}
          dokter ter-assign
        </p>
        {!location.active || location.status !== 'ACTIVE' ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 p-2.5 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Location ini tidak aktif. Assignment dapat disimpan, tetapi tidak muncul pada pendaftaran antrean.</span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {loading ? (
          <ScreenState
            kind="loading"
            title="Memuat dokter aktif"
            description="Daftar dokter dalam Organization sedang diambil."
            compact
          />
        ) : error ? (
          <ScreenState
            kind="error"
            title="Dokter tidak dapat dimuat"
            description={error}
            compact
          />
        ) : items.length === 0 ? (
          <ScreenState
            kind="empty"
            title="Belum ada dokter aktif"
            description="Tambahkan Practitioner dengan role Dokter pada Organization ini terlebih dahulu."
            compact
          />
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, username, atau SIP dokter"
                  aria-label="Cari dokter untuk ditugaskan"
                  disabled={saving}
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-foreground">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                  disabled={!canWrite || saving || visiblePractitioners.length === 0}
                  aria-label="Pilih semua dokter yang tampil"
                />
                Pilih semua yang tampil
              </label>
            </div>
            <div className="divide-y divide-border rounded-[var(--radius-control)] border border-border">
              {visiblePractitioners.length > 0 ? (
                visiblePractitioners.map((practitioner) => {
                  const selected = isSelected(practitioner);
                  return (
                    <label
                      key={practitioner.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-muted data-disabled:cursor-not-allowed"
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                          setDraft((current) => ({
                            ...current,
                            [practitioner.id]: checked === true,
                          }))
                        }
                        disabled={!canWrite || saving}
                        aria-label={`${selected ? 'Hapus assignment' : 'Tugaskan'} ${practitioner.fullName} ke ${location.name}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {practitioner.fullName}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          @{practitioner.username}
                          {practitioner.sipNumber ? ` · ${practitioner.sipNumber}` : ''}
                        </span>
                      </span>
                      {selected ? (
                        <Badge className="shrink-0 clinical-status-success border text-[10px] font-bold">
                          <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                          Ter-assign
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          Belum di-assign
                        </span>
                      )}
                    </label>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  Dokter tidak ditemukan. Coba kata kunci lain.
                </p>
              )}
            </div>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          {canWrite ? (
            <Button type="button" onClick={() => void save()} disabled={saving || loading || Boolean(error)} aria-busy={saving}>
              {saving ? 'Menyimpan assignment...' : 'Simpan assignment'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function isAssignedToLocation(
  practitioner: PractitionerSummary,
  locationId: string,
): boolean {
  return (
    practitioner.locations?.some((location) => location.id === locationId) ??
    practitioner.location?.id === locationId
  );
}

function getAssignedLocationIds(practitioner: PractitionerSummary): string[] {
  if (practitioner.locations?.length) {
    return practitioner.locations.map((location) => location.id);
  }
  return practitioner.location?.id ? [practitioner.location.id] : [];
}
