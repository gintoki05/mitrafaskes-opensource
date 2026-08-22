"use client";

import { useCallback, useEffect, useReducer } from "react";
import { EncounterStatus } from "@mitrafaskes/shared";
import type {
  EncounterListResponse,
  EncounterStatusCounts,
  ListMeta,
  PaginatedListResponse,
  Patient,
  PatientListResponse,
  PatientStatusCounts,
} from "@mitrafaskes/shared";
import { apiFetch } from "@/lib/auth";
import type { Encounter } from "@/lib/clinical-types";
import { ACTIVE_ENCOUNTER_STATUSES } from "@/lib/encounter-statuses";

const DEFAULT_PAGE_SIZE = 25;
const CURRENT_ENCOUNTER_PAGE_SIZE = 100;
const DEFAULT_ENCOUNTER_STATUSES: readonly EncounterStatus[] = ACTIVE_ENCOUNTER_STATUSES;
const CURRENT_PATIENT_ENCOUNTER_STATUSES: readonly EncounterStatus[] = Object.values(
  EncounterStatus,
).filter((status) => status !== EncounterStatus.ENTERED_IN_ERROR);

type RegistrationDataState = {
  patients: Patient[];
  patientsMeta: ListMeta;
  patientsStatusCounts: PatientStatusCounts;
  encounters: Encounter[];
  encountersMeta: ListMeta;
  encountersStatusCounts: EncounterStatusCounts;
  todayEncounters: Encounter[];
  todayEncountersLoading: boolean;
  todayEncountersError: string;
  patientsLoading: boolean;
  encountersLoading: boolean;
  patientsError: string;
  encountersError: string;
};

type RegistrationDataAction =
  | { type: "patients-loading" }
  | { type: "patients-loaded"; response: PatientListResponse }
  | { type: "patients-failed"; error: string }
  | { type: "encounters-loading" }
  | { type: "encounters-loaded"; response: EncounterListResponse }
  | { type: "encounters-failed"; error: string }
  | { type: "today-encounters-loading" }
  | { type: "today-encounters-loaded"; encounters: Encounter[] }
  | { type: "today-encounters-failed"; error: string }
  | {
      type: "initial-load-complete";
      patients: PatientListResponse;
      encounters: EncounterListResponse;
      todayEncounters: Encounter[];
      patientsError: string;
      encountersError: string;
      todayEncountersError: string;
    };

const emptyResponse = <T>(page = 1): { items: T[]; meta: ListMeta } => ({
  items: [],
  meta: { page, pageSize: DEFAULT_PAGE_SIZE, total: 0 },
});

const emptyPatientStatusCounts = (): PatientStatusCounts => ({
  active: 0,
  inactive: 0,
});

const emptyPatientResponse = (page = 1): PatientListResponse => ({
  ...emptyResponse<Patient>(page),
  statusCounts: emptyPatientStatusCounts(),
});

const emptyEncounterStatusCounts = (): EncounterStatusCounts => ({
  planned: 0,
  arrived: 0,
  triaged: 0,
  'in-progress': 0,
  onleave: 0,
  finished: 0,
  cancelled: 0,
  'entered-in-error': 0,
  unknown: 0,
});

const emptyEncounterResponse = (page = 1): EncounterListResponse => ({
  ...emptyResponse<Encounter>(page),
  statusCounts: emptyEncounterStatusCounts(),
});

type ListPayload<T> = PaginatedListResponse<T> | T[];

function countPatientStatuses(patients: readonly Patient[]): PatientStatusCounts {
  return patients.reduce<PatientStatusCounts>(
    (counts, patient) => {
      if (patient.active === false) {
        counts.inactive += 1;
      } else {
        counts.active += 1;
      }
      return counts;
    },
    emptyPatientStatusCounts(),
  );
}

function normalizeListPayload<T>(
  payload: ListPayload<T>,
  page: number,
): PaginatedListResponse<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      meta: {
        page,
        pageSize: payload.length || DEFAULT_PAGE_SIZE,
        total: payload.length,
      },
    };
  }

  if (payload && Array.isArray(payload.items) && payload.meta) {
    return payload;
  }

  return emptyResponse<T>(page);
}

function normalizePatientListPayload(
  payload: PatientListResponse | Patient[],
  page: number,
): PatientListResponse {
  if (Array.isArray(payload)) {
    const response = normalizeListPayload(payload, page);
    return { ...response, statusCounts: countPatientStatuses(response.items) };
  }

  if (payload && Array.isArray(payload.items) && payload.meta) {
    return {
      ...payload,
      statusCounts: payload.statusCounts ?? countPatientStatuses(payload.items),
    };
  }

  return emptyPatientResponse(page);
}

function countEncounterStatuses(
  encounters: readonly Encounter[],
): EncounterStatusCounts {
  return encounters.reduce<EncounterStatusCounts>((counts, encounter) => {
    counts[encounter.status] += 1;
    return counts;
  }, emptyEncounterStatusCounts());
}

function normalizeEncounterListPayload(
  payload: EncounterListResponse | Encounter[],
  page: number,
): EncounterListResponse {
  if (Array.isArray(payload)) {
    const response = normalizeListPayload(payload, page);
    return { ...response, statusCounts: countEncounterStatuses(response.items) };
  }

  if (payload && Array.isArray(payload.items) && payload.meta) {
    return {
      ...payload,
      statusCounts:
        payload.statusCounts ?? countEncounterStatuses(payload.items),
    };
  }

  return emptyEncounterResponse(page);
}

const initialState: RegistrationDataState = {
  patients: [],
  patientsMeta: emptyPatientResponse().meta,
  patientsStatusCounts: emptyPatientStatusCounts(),
  encounters: [],
  encountersMeta: emptyResponse<Encounter>().meta,
  encountersStatusCounts: emptyEncounterStatusCounts(),
  todayEncounters: [],
  todayEncountersLoading: true,
  todayEncountersError: "",
  patientsLoading: true,
  encountersLoading: true,
  patientsError: "",
  encountersError: "",
};

function registrationDataReducer(
  state: RegistrationDataState,
  action: RegistrationDataAction,
): RegistrationDataState {
  switch (action.type) {
    case "patients-loading":
      return { ...state, patientsLoading: true, patientsError: "" };
    case "patients-loaded":
      return {
        ...state,
        patients: action.response.items,
        patientsMeta: action.response.meta,
        patientsStatusCounts:
          action.response.statusCounts ?? countPatientStatuses(action.response.items),
        patientsLoading: false,
        patientsError: "",
      };
    case "patients-failed":
      return { ...state, patientsLoading: false, patientsError: action.error };
    case "encounters-loading":
      return { ...state, encountersLoading: true, encountersError: "" };
    case "encounters-loaded":
      return {
        ...state,
        encounters: action.response.items,
        encountersMeta: action.response.meta,
        encountersStatusCounts:
          action.response.statusCounts ??
          countEncounterStatuses(action.response.items),
        encountersLoading: false,
        encountersError: "",
      };
    case "encounters-failed":
      return {
        ...state,
        encountersLoading: false,
        encountersError: action.error,
      };
    case "today-encounters-loading":
      return { ...state, todayEncountersLoading: true, todayEncountersError: "" };
    case "today-encounters-loaded":
      return {
        ...state,
        todayEncounters: action.encounters,
        todayEncountersLoading: false,
        todayEncountersError: "",
      };
    case "today-encounters-failed":
      return {
        ...state,
        todayEncountersLoading: false,
        todayEncountersError: action.error,
      };
    case "initial-load-complete":
      return {
        patients: action.patients.items,
        patientsMeta: action.patients.meta,
        patientsStatusCounts:
          action.patients.statusCounts ?? countPatientStatuses(action.patients.items),
        encounters: action.encounters.items,
        encountersMeta: action.encounters.meta,
        encountersStatusCounts:
          action.encounters.statusCounts ??
          countEncounterStatuses(action.encounters.items),
        todayEncounters: action.todayEncounters,
        todayEncountersLoading: false,
        todayEncountersError: action.todayEncountersError,
        patientsLoading: false,
        encountersLoading: false,
        patientsError: action.patientsError,
        encountersError: action.encountersError,
      };
  }
}

function listParams(page: number, pageSize = DEFAULT_PAGE_SIZE): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return params;
}

async function requestPatients(
  query = "",
  page = 1,
  active?: boolean,
): Promise<PatientListResponse> {
  const params = listParams(page);
  if (query.trim()) params.set("search", query.trim());
  if (active !== undefined) params.set("active", String(active));
  const response = await apiFetch(`/api/patients?${params.toString()}`);
  if (!response.ok) throw new Error("Daftar pasien tidak dapat dimuat.");
  const payload = (await response.json()) as PatientListResponse | Patient[];
  return normalizePatientListPayload(payload, page);
}

async function requestEncounters(
  page = 1,
  statuses: readonly EncounterStatus[] = DEFAULT_ENCOUNTER_STATUSES,
  pageSize = DEFAULT_PAGE_SIZE,
  includeActiveAcrossDates = true,
): Promise<EncounterListResponse> {
  const params = listParams(page, pageSize);
  params.set("statuses", statuses.join(","));
  params.set("includeActiveAcrossDates", String(includeActiveAcrossDates));
  const response = await apiFetch(`/api/encounters?${params.toString()}`);
  if (!response.ok) throw new Error("Antrean rawat jalan tidak dapat dimuat.");
  const payload = (await response.json()) as EncounterListResponse | Encounter[];
  return normalizeEncounterListPayload(payload, page);
}

async function requestTodayEncounters(): Promise<Encounter[]> {
  const encounters: Encounter[] = [];
  let page = 1;

  while (true) {
    const response = await requestEncounters(
      page,
      CURRENT_PATIENT_ENCOUNTER_STATUSES,
      CURRENT_ENCOUNTER_PAGE_SIZE,
      false,
    );
    encounters.push(...response.items);

    const totalPages = Math.max(
      1,
      Math.ceil(response.meta.total / response.meta.pageSize),
    );
    if (page >= totalPages || response.items.length === 0) break;
    page += 1;
  }

  return encounters;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useRegistrationData() {
  const [state, dispatch] = useReducer(registrationDataReducer, initialState);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      const [patientsResult, encountersResult, todayEncountersResult] = await Promise.allSettled([
        requestPatients("", 1, true),
        requestEncounters(),
        requestTodayEncounters(),
      ]);
      if (!active) return;

      dispatch({
        type: "initial-load-complete",
        patients:
          patientsResult.status === "fulfilled"
            ? patientsResult.value
            : emptyPatientResponse(),
        encounters:
          encountersResult.status === "fulfilled"
            ? encountersResult.value
            : emptyEncounterResponse(),
        todayEncounters:
          todayEncountersResult.status === "fulfilled"
            ? todayEncountersResult.value
            : [],
        patientsError:
          patientsResult.status === "rejected"
            ? messageFrom(
                patientsResult.reason,
                "Daftar pasien tidak dapat dimuat.",
              )
            : "",
        encountersError:
          encountersResult.status === "rejected"
            ? messageFrom(
                encountersResult.reason,
                "Antrean rawat jalan tidak dapat dimuat.",
            )
            : "",
        todayEncountersError:
          todayEncountersResult.status === "rejected"
            ? messageFrom(
                todayEncountersResult.reason,
                "Status kunjungan hari ini tidak dapat dimuat.",
              )
            : "",
      });
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  const refreshPatients = useCallback(
    async (query = "", page = 1, active?: boolean) => {
      dispatch({ type: "patients-loading" });
      try {
        dispatch({
          type: "patients-loaded",
          response: await requestPatients(query, page, active),
        });
      } catch (error) {
        dispatch({
          type: "patients-failed",
          error: messageFrom(error, "Daftar pasien tidak dapat dimuat."),
        });
      }
    },
    [],
  );

  const refreshEncounters = useCallback(
    async (
      page = 1,
      statuses: readonly EncounterStatus[] = DEFAULT_ENCOUNTER_STATUSES,
    ) => {
      dispatch({ type: "encounters-loading" });
      dispatch({ type: "today-encounters-loading" });
      const [encountersResult, todayEncountersResult] = await Promise.allSettled([
        requestEncounters(page, statuses),
        requestTodayEncounters(),
      ]);

      if (encountersResult.status === "fulfilled") {
        dispatch({
          type: "encounters-loaded",
          response: encountersResult.value,
        });
      } else {
        dispatch({
          type: "encounters-failed",
          error: messageFrom(
            encountersResult.reason,
            "Antrean rawat jalan tidak dapat dimuat.",
          ),
        });
      }

      if (todayEncountersResult.status === "fulfilled") {
        dispatch({
          type: "today-encounters-loaded",
          encounters: todayEncountersResult.value,
        });
      } else {
        dispatch({
          type: "today-encounters-failed",
          error: messageFrom(
            todayEncountersResult.reason,
            "Status kunjungan hari ini tidak dapat dimuat.",
          ),
        });
      }
    },
    [],
  );

  return { ...state, refreshPatients, refreshEncounters };
}
