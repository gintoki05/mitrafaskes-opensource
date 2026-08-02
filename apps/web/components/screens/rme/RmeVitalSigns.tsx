'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type RmeVitalSignsProps = {
  systolic: string;
  diastolic: string;
  temperature: string;
  heartRate: string;
  onChange: (field: 'systolic' | 'diastolic' | 'temperature' | 'heartRate', value: string) => void;
};

export function RmeVitalSigns({
  systolic,
  diastolic,
  temperature,
  heartRate,
  onChange,
}: RmeVitalSignsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Activity className="h-4 w-4 text-success" />
          2. Pemeriksaan Fisik & Vital Signs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="systolic" className="mb-1 block text-[11px] font-medium text-muted-foreground">Sistolik (mmHg)</label>
            <Input id="systolic" type="number" value={systolic} onChange={(event) => onChange('systolic', event.target.value)} className="text-xs font-mono" />
          </div>
          <div>
            <label htmlFor="diastolic" className="mb-1 block text-[11px] font-medium text-muted-foreground">Diastolik (mmHg)</label>
            <Input id="diastolic" type="number" value={diastolic} onChange={(event) => onChange('diastolic', event.target.value)} className="text-xs font-mono" />
          </div>
          <div>
            <label htmlFor="temperature" className="mb-1 block text-[11px] font-medium text-muted-foreground">Suhu Tubuh (Â°C)</label>
            <Input id="temperature" type="number" step="0.1" value={temperature} onChange={(event) => onChange('temperature', event.target.value)} className="text-xs font-mono" />
          </div>
          <div>
            <label htmlFor="heart-rate" className="mb-1 block text-[11px] font-medium text-muted-foreground">Denyut Nadi (bpm)</label>
            <Input id="heart-rate" type="number" value={heartRate} onChange={(event) => onChange('heartRate', event.target.value)} className="text-xs font-mono" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

