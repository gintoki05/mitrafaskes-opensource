'use client';

import { useMemo, useState } from 'react';
import type { LocationSummary } from '@mitrafaskes/shared';
import { MapPin, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FormField';

type PractitionerLocationSelectorProps = {
  id: string;
  organizationId: string | null | undefined;
  locations: LocationSummary[];
  value: string[];
  onChange: (locationIds: string[]) => void;
  disabled?: boolean;
};

export function PractitionerLocationSelector({
  id,
  organizationId,
  locations,
  value,
  onChange,
  disabled = false,
}: PractitionerLocationSelectorProps) {
  const [search, setSearch] = useState('');
  const availableLocations = useMemo(
    () =>
      organizationId
        ? locations.filter((location) => location.organizationId === organizationId)
        : [],
    [locations, organizationId],
  );
  const filteredLocations = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID');
    if (!normalizedSearch) return availableLocations;
    return availableLocations.filter((location) =>
      `${location.name} ${location.code}`
        .toLocaleLowerCase('id-ID')
        .includes(normalizedSearch),
    );
  }, [availableLocations, search]);

  const toggleLocation = (locationId: string, checked: boolean) => {
    if (checked) {
      onChange(value.includes(locationId) ? value : [...value, locationId]);
      return;
    }
    onChange(value.filter((selectedId) => selectedId !== locationId));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={`${id}-search`}>Location penempatan</FieldLabel>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {value.length} dipilih
        </Badge>
      </div>
      <p id={`${id}-description`} className="mb-2 text-xs text-muted-foreground">
        Dokter dapat ditugaskan ke beberapa Location dalam Organization yang sama.
      </p>

      {!organizationId ? (
        <div className="rounded-[var(--radius-control)] border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          Pilih Organization terlebih dahulu untuk melihat daftar Location.
        </div>
      ) : availableLocations.length === 0 ? (
        <div className="rounded-[var(--radius-control)] border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          Belum ada Location pada Organization ini.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-control)] border border-border bg-card">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={`${id}-search`}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau kode Location"
                aria-describedby={`${id}-description`}
                disabled={disabled}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div
            className="max-h-56 overflow-y-auto p-1"
            role="group"
            aria-label="Daftar Location penempatan"
          >
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location) => {
                const selected = value.includes(location.id);
                return (
                  <label
                    key={location.id}
                    htmlFor={`${id}-${location.id}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-muted',
                      selected && 'bg-primary/5',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Checkbox
                      id={`${id}-${location.id}`}
                      checked={selected}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        toggleLocation(location.id, checked === true)
                      }
                      aria-label={`Tugaskan ke ${location.name}`}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{location.name}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{location.code}</span>
                        <span>{location.active ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Location tidak ditemukan. Coba nama atau kode lain.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
