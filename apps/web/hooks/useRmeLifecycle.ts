'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AllergyReviewStatus,
  MedicalRecordServiceProfile,
  OutpatientDisposition,
  type MedicalRecord,
  type RmePreflightResult,
  type RmeValidationIssue,
  type SaveMedicalRecordDraftDto,
} from '@mitrafaskes/shared';
import { apiFetch } from '@/lib/auth';
import type { RmeFormValues } from '@/components/screens/rme/rme-form-schema';
import {
  versionConflictFrom,
  type RmeVersionConflict,
} from '@/components/screens/rme/rme-workspace-model';

export type RmeMutationState =
  | 'idle'
  | 'preflighting'
  | 'saving-draft'
  | 'draft-saved'
  | 'finalizing';

type RmeApiErrorBody = {
  code?: string;
  message?: string;
  errors?: RmeValidationIssue[];
  issues?: RmeValidationIssue[];
  currentVersion?: number;
};

export class RmeApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly issues: RmeValidationIssue[] = [],
    readonly currentVersion?: number,
  ) {
    super(message);
  }
}

async function readResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  const body = (text ? JSON.parse(text) : null) as
    | T
    | RmeApiErrorBody
    | null;
  if (!response.ok) {
    const error = (body ?? {}) as RmeApiErrorBody;
    throw new RmeApiError(
      error.message ?? 'RME tidak dapat diproses.',
      error.code,
      error.issues ?? error.errors ?? [],
      error.currentVersion,
    );
  }
  return body as T | null;
}

function draftPayload(
  encounterId: string,
  expectedVersion: number,
  values: RmeFormValues,
  record: MedicalRecord | null,
): SaveMedicalRecordDraftDto {
  const observationDefinitions = [
    {
      field: 'systolic' as const,
      code: '8480-6',
      display: 'Systolic blood pressure',
      unit: 'mmHg',
      unitCode: 'mm[Hg]',
    },
    {
      field: 'diastolic' as const,
      code: '8462-4',
      display: 'Diastolic blood pressure',
      unit: 'mmHg',
      unitCode: 'mm[Hg]',
    },
    {
      field: 'heartRate' as const,
      code: '8867-4',
      display: 'Heart rate',
      unit: 'per minute',
      unitCode: '/min',
    },
    {
      field: 'temperature' as const,
      code: '8310-5',
      display: 'Body temperature',
      unit: 'Cel',
      unitCode: 'Cel',
    },
    {
      field: 'weight' as const,
      code: '29463-7',
      display: 'Body weight',
      unit: 'kg',
      unitCode: 'kg',
    },
    {
      field: 'height' as const,
      code: '8302-2',
      display: 'Body height',
      unit: 'cm',
      unitCode: 'cm',
    },
  ] as const;
  const knownCodes = new Set<string>(
    observationDefinitions
      .map((definition) => definition.code)
      .concat(['39156-5', 'body-mass-index']),
  );
  const observations = observationDefinitions.flatMap((definition) => {
    const rawValue = values[definition.field];
    if (!rawValue.trim()) return [];
    const existing = (record?.observations ?? []).find(
      (observation) => observation.code.code === definition.code,
    );
    return [{
      ...(existing?.id ? { id: existing.id } : {}),
      category: 'vital-signs',
      code: {
        system: 'http://loinc.org',
        code: definition.code,
        display: definition.display,
      },
      value: {
        type: 'quantity' as const,
        value: Number(rawValue),
        unit: definition.unit,
        system: 'http://unitsofmeasure.org',
        code: definition.unitCode,
      },
      ...(existing?.effectiveAt ? { effectiveAt: existing.effectiveAt } : {}),
      ...(existing?.performerId ? { performerId: existing.performerId } : {}),
      ...(existing?.status ? { status: existing.status } : {}),
      ...(existing?.provenance ? { provenance: existing.provenance } : {}),
      ...(existing?.derivedFromObservationIds
        ? { derivedFromObservationIds: existing.derivedFromObservationIds }
        : {}),
      ...(existing?.referenceRange ? { referenceRange: existing.referenceRange } : {}),
      ...(existing?.interpretation ? { interpretation: existing.interpretation } : {}),
    }];
  });
  const untouchedObservations = (record?.observations ?? [])
    .filter((observation) => !knownCodes.has(observation.code.code))
    .map((observation) => ({
      id: observation.id,
      category: observation.category,
      code: observation.code,
      value: observation.value,
      effectiveAt: observation.effectiveAt,
      ...(observation.performerId ? { performerId: observation.performerId } : {}),
      status: observation.status,
      provenance: observation.provenance,
      derivedFromObservationIds: observation.derivedFromObservationIds,
      ...(observation.referenceRange ? { referenceRange: observation.referenceRange } : {}),
      ...(observation.interpretation ? { interpretation: observation.interpretation } : {}),
    }));
  return {
    encounterId,
    expectedVersion,
    serviceProfile: MedicalRecordServiceProfile.OUTPATIENT_GENERAL,
    ...values,
    allergyReviewStatus:
      values.allergyReviewStatus === ''
        ? undefined
        : values.allergyReviewStatus as AllergyReviewStatus,
    disposition:
      values.disposition === ''
        ? undefined
        : values.disposition as OutpatientDisposition,
    systolic: values.systolic ? Number(values.systolic) : undefined,
    diastolic: values.diastolic ? Number(values.diastolic) : undefined,
    heartRate: values.heartRate ? Number(values.heartRate) : undefined,
    temperature: values.temperature ? Number(values.temperature) : undefined,
    weight: values.weight ? Number(values.weight) : undefined,
    height: values.height ? Number(values.height) : undefined,
    observations: [...observations, ...untouchedObservations],
  };
}

export function useRmeLifecycle(encounterId: string | null) {
  const [loadState, setLoadState] = useState<{
    encounterId: string | null;
    record: MedicalRecord | null;
    error: string;
    loading: boolean;
  }>({ encounterId: null, record: null, error: '', loading: false });
  const [mutation, setMutation] = useState<{
    encounterId: string | null;
    state: RmeMutationState;
  }>({ encounterId: null, state: 'idle' });
  const [reloadKey, setReloadKey] = useState(0);
  const [conflictState, setConflictState] = useState<{
    encounterId: string | null;
    conflict: RmeVersionConflict | null;
  }>({ encounterId: null, conflict: null });
  const [finalizationState, setFinalizationState] = useState<{
    encounterId: string | null;
    issues: RmeValidationIssue[];
  }>({ encounterId: null, issues: [] });
  const finalizeRequest = useRef<{
    encounterId: string;
    version: number;
    idempotencyKey: string;
  } | null>(null);
  const record =
    loadState.encounterId === encounterId ? loadState.record : null;
  const loadError =
    loadState.encounterId === encounterId ? loadState.error : '';
  const loading = Boolean(
    encounterId &&
      (loadState.encounterId !== encounterId || loadState.loading),
  );
  const mutationState =
    mutation.encounterId === encounterId ? mutation.state : 'idle';
  const conflict =
    conflictState.encounterId === encounterId
      ? conflictState.conflict
      : null;
  const finalizationIssues =
    finalizationState.encounterId === encounterId
      ? finalizationState.issues
      : [];

  useEffect(() => {
    let active = true;
    if (!encounterId) {
      return () => {
        active = false;
      };
    }

    void apiFetch(`/api/rme/encounter/${encounterId}`)
      .then((response) => readResponse<MedicalRecord>(response))
      .then((loaded) => {
        if (active) {
          setLoadState({ encounterId, record: loaded, error: '', loading: false });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            encounterId,
            record: null,
            error:
              error instanceof Error ? error.message : 'RME tidak dapat dimuat.',
            loading: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [encounterId, reloadKey]);

  const reload = useCallback(() => {
    if (!encounterId) return;
    setLoadState((current) => ({
      encounterId,
      record: current.encounterId === encounterId ? current.record : null,
      error: '',
      loading: true,
    }));
    setConflictState({ encounterId, conflict: null });
    setFinalizationState({ encounterId, issues: [] });
    setReloadKey((current) => current + 1);
  }, [encounterId]);

  const saveDraft = useCallback(
    async (values: RmeFormValues) => {
      if (!encounterId) return null;
      setMutation({ encounterId, state: 'saving-draft' });
      try {
        const response = await apiFetch('/api/rme/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            draftPayload(encounterId, record?.version ?? 0, values, record),
          ),
        });
        const saved = await readResponse<MedicalRecord>(response);
        if (!saved) throw new RmeApiError('API tidak mengembalikan draft RME.');
        setLoadState({ encounterId, record: saved, error: '', loading: false });
        setConflictState({ encounterId, conflict: null });
        setFinalizationState({ encounterId, issues: [] });
        setMutation({ encounterId, state: 'draft-saved' });
        return saved;
      } catch (error) {
        setConflictState({
          encounterId,
          conflict: versionConflictFrom(error),
        });
        setMutation({ encounterId, state: 'idle' });
        throw error;
      }
    },
    [encounterId, record],
  );

  const preflight = useCallback(async () => {
    if (!encounterId || !record) return null;
    setMutation({ encounterId, state: 'preflighting' });
    try {
      const response = await apiFetch('/api/rme/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId,
          expectedVersion: record.version,
        }),
      });
      const result = await readResponse<RmePreflightResult>(response);
      if (!result) throw new RmeApiError('API tidak mengembalikan hasil preflight.');
      setFinalizationState({ encounterId, issues: result.issues });
      setConflictState({ encounterId, conflict: null });
      setMutation({ encounterId, state: 'idle' });
      return result;
    } catch (error) {
      setFinalizationState({
        encounterId,
        issues: error instanceof RmeApiError ? error.issues : [],
      });
      setConflictState({ encounterId, conflict: versionConflictFrom(error) });
      setMutation({ encounterId, state: 'idle' });
      throw error;
    }
  }, [encounterId, record]);

  const finalize = useCallback(async () => {
    if (!encounterId || !record) return null;
    setMutation({ encounterId, state: 'finalizing' });
    try {
      if (
        !finalizeRequest.current ||
        finalizeRequest.current.encounterId !== encounterId ||
        finalizeRequest.current.version !== record.version
      ) {
        finalizeRequest.current = {
          encounterId,
          version: record.version,
          idempotencyKey: crypto.randomUUID(),
        };
      }
      const response = await apiFetch('/api/rme/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId,
          expectedVersion: record.version,
          idempotencyKey: finalizeRequest.current.idempotencyKey,
        }),
      });
      const finalized = await readResponse<MedicalRecord>(response);
      if (!finalized) throw new RmeApiError('API tidak mengembalikan RME final.');
      setLoadState({ encounterId, record: finalized, error: '', loading: false });
      setConflictState({ encounterId, conflict: null });
      setFinalizationState({ encounterId, issues: [] });
      setMutation({ encounterId, state: 'idle' });
      return finalized;
    } catch (error) {
      setFinalizationState({
        encounterId,
        issues: error instanceof RmeApiError ? error.issues : [],
      });
      setConflictState({
        encounterId,
        conflict: versionConflictFrom(error),
      });
      setMutation({ encounterId, state: 'idle' });
      throw error;
    }
  }, [encounterId, record]);

  return {
    record,
    loading,
    loadError,
    mutationState,
    conflict,
    finalizationIssues,
    reload,
    saveDraft,
    preflight,
    finalize,
  };
}
