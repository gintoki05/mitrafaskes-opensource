"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  MedicalRecord,
  RmeValidationIssue,
  SaveTriageDraftDto,
} from "@mitrafaskes/shared";
import { apiFetch } from "@/lib/auth";
import type { TriageFormValues } from "./triage-types";

export type TriageMutationState = "idle" | "loading" | "saving" | "completing";

export class TriageApiError extends Error {
  constructor(
    message: string,
    readonly issues: RmeValidationIssue[] = [],
  ) {
    super(message);
  }
}

type ErrorBody = {
  message?: string;
  issues?: RmeValidationIssue[];
  errors?: RmeValidationIssue[];
};

async function readResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  const body = (text ? JSON.parse(text) : null) as T | ErrorBody | null;
  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    throw new TriageApiError(
      error.message ?? "Triase tidak dapat diproses.",
      error.issues ?? error.errors ?? [],
    );
  }
  return body as T | null;
}

const observationDefinitions = [
  {
    field: "systolic",
    code: "8480-6",
    display: "Systolic blood pressure",
    unit: "mmHg",
    unitCode: "mm[Hg]",
  },
  {
    field: "diastolic",
    code: "8462-4",
    display: "Diastolic blood pressure",
    unit: "mmHg",
    unitCode: "mm[Hg]",
  },
  {
    field: "heartRate",
    code: "8867-4",
    display: "Heart rate",
    unit: "per minute",
    unitCode: "/min",
  },
  {
    field: "temperature",
    code: "8310-5",
    display: "Body temperature",
    unit: "Cel",
    unitCode: "Cel",
  },
  {
    field: "weight",
    code: "29463-7",
    display: "Body weight",
    unit: "kg",
    unitCode: "kg",
  },
  {
    field: "height",
    code: "8302-2",
    display: "Body height",
    unit: "cm",
    unitCode: "cm",
  },
  {
    field: "respiratoryRate",
    code: "9279-1",
    display: "Respiratory rate",
    unit: "per minute",
    unitCode: "/min",
  },
  {
    field: "oxygenSaturation",
    code: "2708-6",
    display: "Oxygen saturation",
    unit: "%",
    unitCode: "%",
  },
] as const;

function triagePayload(
  encounterId: string,
  expectedVersion: number,
  values: TriageFormValues,
  record: MedicalRecord | null,
): SaveTriageDraftDto {
  const knownCodes = new Set<string>(
    observationDefinitions.map((definition) => definition.code),
  );
  const observations = observationDefinitions.flatMap((definition) => {
    const rawValue = values[definition.field];
    if (!rawValue.trim()) return [];
    const existing = record?.observations.find(
      (observation) => observation.code.code === definition.code,
    );
    return [
      {
        ...(existing?.id ? { id: existing.id } : {}),
        category: "vital-signs",
        code: {
          system: "http://loinc.org",
          code: definition.code,
          display: definition.display,
        },
        value: {
          type: "quantity" as const,
          value: Number(rawValue),
          unit: definition.unit,
          system: "http://unitsofmeasure.org",
          code: definition.unitCode,
        },
        ...(existing?.effectiveAt ? { effectiveAt: existing.effectiveAt } : {}),
        ...(existing?.performerId ? { performerId: existing.performerId } : {}),
        ...(existing?.status ? { status: existing.status } : {}),
        ...(existing?.provenance ? { provenance: existing.provenance } : {}),
      },
    ];
  });
  const preserved = (record?.observations ?? [])
    .filter((observation) => !knownCodes.has(observation.code.code))
    .map((observation) => ({
      id: observation.id,
      category: observation.category,
      code: observation.code,
      value: observation.value,
      effectiveAt: observation.effectiveAt,
      ...(observation.performerId
        ? { performerId: observation.performerId }
        : {}),
      status: observation.status,
      provenance: observation.provenance,
      derivedFromObservationIds: observation.derivedFromObservationIds,
    }));
  return {
    encounterId,
    expectedVersion,
    chiefComplaint: values.chiefComplaint,
    presentIllness: values.presentIllness,
    allergyReviewStatus: values.allergyReviewStatus || undefined,
    allergyDetails: values.allergyDetails,
    anamnesis: values.anamnesis,
    histories: values.histories
      .filter((history) => history.text.trim())
      .map((history) => ({
        ...(history.id ? { id: history.id } : {}),
        category: history.category,
        text: history.text,
        ...(history.status ? { status: history.status } : {}),
        ...(history.onset ? { onset: history.onset } : {}),
        ...(history.note.trim() ? { note: history.note } : {}),
      })),
    systolic: values.systolic ? Number(values.systolic) : undefined,
    diastolic: values.diastolic ? Number(values.diastolic) : undefined,
    heartRate: values.heartRate ? Number(values.heartRate) : undefined,
    temperature: values.temperature ? Number(values.temperature) : undefined,
    weight: values.weight ? Number(values.weight) : undefined,
    height: values.height ? Number(values.height) : undefined,
    observations:
      observations.length || preserved.length
        ? [...observations, ...preserved]
        : undefined,
  };
}

export function useTriageLifecycle(encounterId: string | null) {
  const [loadState, setLoadState] = useState<{
    encounterId: string | null;
    record: MedicalRecord | null;
    error: string;
    loading: boolean;
  }>({ encounterId: null, record: null, error: "", loading: false });
  const [mutation, setMutation] = useState<{
    encounterId: string | null;
    state: TriageMutationState;
  }>({ encounterId: null, state: "idle" });
  const [issues, setIssues] = useState<RmeValidationIssue[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const record =
    loadState.encounterId === encounterId ? loadState.record : null;
  const loading = Boolean(
    encounterId && (loadState.encounterId !== encounterId || loadState.loading),
  );
  const loadError =
    loadState.encounterId === encounterId ? loadState.error : "";
  const mutationState =
    mutation.encounterId === encounterId ? mutation.state : "idle";

  useEffect(() => {
    let active = true;
    if (!encounterId) return;

    void apiFetch(`/api/rme/triage/encounter/${encounterId}`)
      .then((response) => readResponse<MedicalRecord>(response))
      .then((loaded) => {
        if (active) {
          setLoadState({
            encounterId,
            record: loaded,
            error: "",
            loading: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            encounterId,
            record: null,
            error:
              error instanceof Error
                ? error.message
                : "Triase tidak dapat dimuat.",
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
      error: "",
      loading: true,
    }));
    setIssues([]);
    setReloadKey((current) => current + 1);
  }, [encounterId]);

  const saveDraft = useCallback(
    async (values: TriageFormValues) => {
      if (!encounterId) return;
      setMutation({ encounterId, state: "saving" });
      setIssues([]);
      try {
        const response = await apiFetch("/api/rme/triage/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            triagePayload(encounterId, record?.version ?? 0, values, record),
          ),
        });
        const saved = await readResponse<MedicalRecord>(response);
        setLoadState({ encounterId, record: saved, error: "", loading: false });
        return saved;
      } catch (error) {
        if (error instanceof TriageApiError) setIssues(error.issues);
        throw error;
      } finally {
        setMutation({ encounterId, state: "idle" });
      }
    },
    [encounterId, record],
  );

  const complete = useCallback(async () => {
    if (!encounterId || !record) return;
    setMutation({ encounterId, state: "completing" });
    setIssues([]);
    try {
      const response = await apiFetch("/api/rme/triage/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId,
          expectedVersion: record.version,
          idempotencyKey: `triage-${encounterId}-${record.version}-${Date.now()}`,
        }),
      });
      const saved = await readResponse<MedicalRecord>(response);
      setLoadState({ encounterId, record: saved, error: "", loading: false });
      return saved;
    } catch (error) {
      if (error instanceof TriageApiError) setIssues(error.issues);
      throw error;
    } finally {
      setMutation({ encounterId, state: "idle" });
    }
  }, [encounterId, record]);

  return {
    record,
    loading,
    loadError,
    mutationState,
    issues,
    reload,
    saveDraft,
    complete,
  };
}
