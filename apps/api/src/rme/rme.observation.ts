import { randomUUID } from 'node:crypto';
import type {
  ClinicalObservationProvenance,
  ClinicalObservationStatus,
  ClinicalObservationValueType,
} from '@mitrafaskes/shared';

export type RmeObservationDraft = {
  id?: string;
  category: string;
  codeSystem?: string;
  code: string;
  codeDisplay?: string;
  valueType: ClinicalObservationValueType;
  valueQuantityValue?: number;
  valueQuantityUnit?: string;
  valueQuantitySystem?: string;
  valueQuantityCode?: string;
  valueCodeSystem?: string;
  valueCode?: string;
  valueCodeDisplay?: string;
  valueBoolean?: boolean;
  valueString?: string;
  effectiveAt?: Date;
  performerId?: string;
  status: ClinicalObservationStatus;
  provenance: ClinicalObservationProvenance;
  derivedFromObservationIds: string[];
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  interpretationCode?: string;
  interpretationDisplay?: string;
};

type LegacyVitalInput = {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
};

type ObservationCode = {
  codeSystem?: string;
  code: string;
  codeDisplay?: string;
};

const LEGACY_VITALS: readonly (ObservationCode & {
  field: keyof LegacyVitalInput;
  display: string;
  unit: string;
  unitCode: string;
})[] = [
  {
    field: 'systolic',
    code: 'systolic-blood-pressure',
    codeDisplay: 'Tekanan darah sistolik',
    display: 'Tekanan darah sistolik',
    unit: 'mmHg',
    unitCode: 'mm[Hg]',
  },
  {
    field: 'diastolic',
    code: 'diastolic-blood-pressure',
    codeDisplay: 'Tekanan darah diastolik',
    display: 'Tekanan darah diastolik',
    unit: 'mmHg',
    unitCode: 'mm[Hg]',
  },
  {
    field: 'heartRate',
    code: 'heart-rate',
    codeDisplay: 'Denyut nadi',
    display: 'Denyut nadi',
    unit: 'per minute',
    unitCode: '/min',
  },
  {
    field: 'temperature',
    code: 'body-temperature',
    codeDisplay: 'Suhu tubuh',
    display: 'Suhu tubuh',
    unit: 'Cel',
    unitCode: 'Cel',
  },
  {
    field: 'weight',
    code: 'body-weight',
    codeDisplay: 'Berat badan',
    display: 'Berat badan',
    unit: 'kg',
    unitCode: 'kg',
  },
  {
    field: 'height',
    code: 'body-height',
    codeDisplay: 'Tinggi badan',
    display: 'Tinggi badan',
    unit: 'cm',
    unitCode: 'cm',
  },
];

export function buildObservationDrafts(
  observations: RmeObservationDraft[],
  legacy: LegacyVitalInput,
  now: Date,
  performerId?: string,
): RmeObservationDraft[] {
  const drafts =
    observations.length > 0
      ? observations.map((observation) => ({
          ...observation,
          performerId: observation.performerId ?? performerId,
          effectiveAt: observation.effectiveAt ?? now,
        }))
      : legacyObservationDrafts(legacy, now, performerId);

  const weight = findQuantity(drafts, ['body-weight', '29463-7']);
  const height = findQuantity(drafts, ['body-height', '8302-2']);
  const bmi = findQuantity(drafts, ['body-mass-index', '39156-5']);
  const derivedBmi =
    weight !== undefined && height !== undefined && height > 0
      ? weight / (height / 100) ** 2
      : undefined;
  if (
    derivedBmi !== undefined &&
    Number.isFinite(derivedBmi) &&
    bmi === undefined
  ) {
    drafts.push({
      category: 'vital-signs',
      code: 'body-mass-index',
      codeDisplay: 'Indeks massa tubuh',
      valueType: 'quantity',
      valueQuantityValue: derivedBmi,
      valueQuantityUnit: 'kg/m2',
      valueQuantitySystem: 'http://unitsofmeasure.org',
      valueQuantityCode: 'kg/m2',
      effectiveAt: now,
      performerId,
      status: 'final',
      provenance: 'derived',
      derivedFromObservationIds: [],
    });
  }
  return drafts;
}

export function projectLegacyVitals(
  observations: RmeObservationDraft[],
): LegacyVitalInput {
  const result: LegacyVitalInput = {};
  for (const definition of LEGACY_VITALS) {
    const observation = observations.find((candidate) =>
      matchesCode(
        candidate,
        [definition.code, loincForLegacyCode(definition.code)].filter(
          (code): code is string => Boolean(code),
        ),
      ),
    );
    const value = observation?.valueQuantityValue;
    if (value !== undefined) result[definition.field] = value;
  }
  return result;
}

export function isDerivedBmi(
  observation: Pick<RmeObservationDraft, 'code' | 'provenance'>,
): boolean {
  return (
    observation.provenance === 'derived' &&
    (observation.code === 'body-mass-index' || observation.code === '39156-5')
  );
}

export function sourceObservationIdsForDerived(
  observation: RmeObservationDraft,
  prepared: readonly RmeObservationDraft[],
): string[] {
  if (observation.derivedFromObservationIds.length > 0) {
    return observation.derivedFromObservationIds;
  }
  if (!isDerivedBmi(observation)) return [];
  return prepared
    .filter(
      (candidate) =>
        candidate.id &&
        matchesCode(candidate, [
          'body-weight',
          '29463-7',
          'body-height',
          '8302-2',
        ]),
    )
    .map((candidate) => candidate.id as string);
}

export function observationInputId(): string {
  return randomUUID();
}

function legacyObservationDrafts(
  legacy: LegacyVitalInput,
  effectiveAt: Date,
  performerId?: string,
): RmeObservationDraft[] {
  return LEGACY_VITALS.flatMap((definition) => {
    const value = legacy[definition.field];
    if (value === undefined) return [];
    return [
      {
        category: 'vital-signs',
        code: definition.code,
        codeDisplay: definition.codeDisplay,
        valueType: 'quantity' as const,
        valueQuantityValue: value,
        valueQuantityUnit: definition.unit,
        valueQuantitySystem: 'http://unitsofmeasure.org',
        valueQuantityCode: definition.unitCode,
        effectiveAt,
        performerId,
        status: 'final' as const,
        provenance: 'original' as const,
        derivedFromObservationIds: [],
      },
    ];
  });
}

function findQuantity(
  observations: readonly RmeObservationDraft[],
  codes: readonly string[],
): number | undefined {
  const observation = observations.find((candidate) =>
    matchesCode(candidate, codes),
  );
  return observation?.valueType === 'quantity'
    ? observation.valueQuantityValue
    : undefined;
}

function matchesCode(
  observation: Pick<RmeObservationDraft, 'code'>,
  codes: readonly string[],
): boolean {
  return codes.includes(observation.code);
}

function loincForLegacyCode(code: string): string | undefined {
  const mapping: Record<string, string> = {
    'systolic-blood-pressure': '8480-6',
    'diastolic-blood-pressure': '8462-4',
    'heart-rate': '8867-4',
    'body-temperature': '8310-5',
    'body-weight': '29463-7',
    'body-height': '8302-2',
    'body-mass-index': '39156-5',
  };
  return mapping[code];
}
