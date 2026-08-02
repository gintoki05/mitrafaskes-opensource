'use client';

import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Encounter } from '@/lib/clinical-types';

export function RmePatientBanner({ encounter }: { encounter: Encounter }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-primary/20 bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-primary/30 bg-primary/10 text-primary">
          <User className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-foreground">{encounter.patient?.fullName}</div>
          <div className="flex min-w-0 flex-wrap gap-3 font-mono text-xs text-muted-foreground">
            <span>No. RM: {encounter.patient?.medicalRecNo}</span>
            <span>NIK: {encounter.patient?.nik}</span>
          </div>
        </div>
      </div>
      <Badge className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
        Rawat Jalan - Poli Umum
      </Badge>
    </div>
  );
}

