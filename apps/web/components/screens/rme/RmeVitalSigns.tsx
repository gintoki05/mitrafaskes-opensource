"use client";

import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RmeVitalSignsProps = {
  systolic: string;
  diastolic: string;
  temperature: string;
  heartRate: string;
  weight: string;
  height: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  onChange: (
    field:
      | "systolic"
      | "diastolic"
      | "temperature"
      | "heartRate"
      | "weight"
      | "height"
      | "respiratoryRate"
      | "oxygenSaturation",
    value: string,
  ) => void;
};

const vitalLabelClassName =
  "mb-2 flex min-h-10 items-start text-sm font-medium leading-5 text-foreground";

export function RmeVitalSigns({
  systolic,
  diastolic,
  temperature,
  heartRate,
  weight,
  height,
  respiratoryRate,
  oxygenSaturation,
  onChange,
}: RmeVitalSignsProps) {
  return (
    <Card className="gap-7 py-6">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Activity className="h-5 w-5 shrink-0 text-success" />
          2. Tanda Vital
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-8">
          <div>
            <label
              htmlFor="systolic"
              className={vitalLabelClassName}
            >
              Sistolik (mmHg)
            </label>
            <Input
              id="systolic"
              type="number"
              value={systolic}
              onChange={(event) => onChange("systolic", event.target.value)}
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="diastolic"
              className={vitalLabelClassName}
            >
              Diastolik (mmHg)
            </label>
            <Input
              id="diastolic"
              type="number"
              value={diastolic}
              onChange={(event) => onChange("diastolic", event.target.value)}
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="temperature"
              className={vitalLabelClassName}
            >
              Suhu Tubuh (&deg;C)
            </label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              value={temperature}
              onChange={(event) => onChange("temperature", event.target.value)}
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="heart-rate"
              className={vitalLabelClassName}
            >
              Denyut Nadi (bpm)
            </label>
            <Input
              id="heart-rate"
              type="number"
              value={heartRate}
              onChange={(event) => onChange("heartRate", event.target.value)}
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="weight"
              className={vitalLabelClassName}
            >
              Berat (kg)
            </label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              value={weight}
              onChange={(event) => onChange("weight", event.target.value)}
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="height"
              className={vitalLabelClassName}
            >
              Tinggi (cm)
            </label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={height}
              onChange={(event) => onChange("height", event.target.value)}
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="respiratory-rate"
              className={vitalLabelClassName}
            >
              Laju napas (/menit)
            </label>
            <Input
              id="respiratory-rate"
              type="number"
              step="1"
              min="0"
              value={respiratoryRate}
              onChange={(event) =>
                onChange("respiratoryRate", event.target.value)
              }
              className="h-12 text-sm font-medical-mono"
            />
          </div>
          <div>
            <label
              htmlFor="oxygen-saturation"
              className={vitalLabelClassName}
            >
              SpO₂ (%)
            </label>
            <Input
              id="oxygen-saturation"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={oxygenSaturation}
              onChange={(event) =>
                onChange("oxygenSaturation", event.target.value)
              }
              className="h-12 text-sm font-medical-mono"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
