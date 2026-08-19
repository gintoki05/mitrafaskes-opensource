'use client';

import { Activity } from 'lucide-react';
import type { ClinicalObservation } from '@mitrafaskes/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SatusehatLinkageBadge } from '@/components/satusehat/SatusehatLinkageBadge';
import {
  getIntegrationLinkage,
  getLatestIntegrationSync,
} from '@/lib/integrations';

type RmeObservationSectionProps = {
  observations: ClinicalObservation[];
};

export function RmeObservationSection({
  observations,
}: RmeObservationSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Activity className="h-4 w-4 text-success" />
          Observation terstruktur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {observations.map((observation) => {
          const resourceName = observation.code.display ?? observation.code.code;
          const latestSync = getLatestIntegrationSync(
            observation.integrations,
            'SATUSEHAT',
          );
          return (
            <div
              key={observation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 font-mono text-xs font-bold text-primary">
                    {observation.code.code}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {resourceName}
                  </span>
                  {observation.provenance === 'derived' ? (
                    <Badge variant="outline" className="text-[10px]">
                      DERIVED
                    </Badge>
                  ) : null}
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatObservationValue(observation)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SatusehatLinkageBadge
                    linkage={getIntegrationLinkage(
                      observation.integrations,
                      'SATUSEHAT',
                    )}
                    resourceName={resourceName}
                  />
                  {latestSync?.status === 'FAILED' ? (
                    <span
                      className="text-[11px] font-semibold text-destructive"
                      title={latestSync.errorMessage}
                    >
                      Sync terakhir gagal
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {observations.length === 0 ? (
          <p className="rounded-[var(--radius-control)] border border-dashed border-border p-3 text-xs text-muted-foreground">
            Simpan draft dengan tanda vital untuk membentuk child Observation
            typed dan mendapatkan aksi sinkronisasi per item.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatObservationValue(observation: ClinicalObservation): string {
  if (observation.value.type === 'quantity') {
    return `${observation.value.value} ${observation.value.unit}`;
  }
  if (observation.value.type === 'code') {
    return observation.value.coding[0]?.display ?? observation.value.coding[0]?.code ?? '-';
  }
  return String(observation.value.value);
}
