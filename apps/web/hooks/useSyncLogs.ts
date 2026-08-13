'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { apiFetch } from '@/lib/auth';
import type {
  IntegrationReconciliationResponse,
  ListMeta,
} from '@mitrafaskes/shared';
import type { SyncLog, SyncLogListResponse } from '@/lib/clinical-types';

type SyncLogsState = {
  logs: SyncLog[];
  logsMeta: ListMeta;
  selectedLog: SyncLog | null;
  logsLoading: boolean;
  retryingId: string | null;
  error: string;
  retryError: string;
  successMessage: string;
  reconciliation: IntegrationReconciliationResponse | null;
  reconciliationLoading: boolean;
  reconciliationError: string;
};

type SyncLogsAction =
  | { type: 'load-start' }
  | { type: 'load-success'; response: SyncLogListResponse }
  | { type: 'load-failure'; error: string }
  | { type: 'select-log'; log: SyncLog }
  | { type: 'retry-start'; logId: string }
  | { type: 'retry-success'; response: SyncLogListResponse }
  | { type: 'retry-failure'; error: string }
  | { type: 'reconcile-start' }
  | { type: 'reconcile-success'; report: IntegrationReconciliationResponse }
  | { type: 'reconcile-failure'; error: string };

const initialState: SyncLogsState = {
  logs: [],
  logsMeta: { page: 1, pageSize: 25, total: 0 },
  selectedLog: null,
  logsLoading: true,
  retryingId: null,
  error: '',
  retryError: '',
  successMessage: '',
  reconciliation: null,
  reconciliationLoading: false,
  reconciliationError: '',
};

function withSelectedLog(
  state: SyncLogsState,
  response: SyncLogListResponse,
): SyncLogsState {
  const selectedLog = state.selectedLog
    ? response.items.find((log) => log.id === state.selectedLog?.id) ??
      response.items[0] ??
      null
    : response.items[0] ?? null;

  return {
    ...state,
    logs: response.items,
    logsMeta: response.meta,
    selectedLog,
  };
}

function syncLogsReducer(
  state: SyncLogsState,
  action: SyncLogsAction,
): SyncLogsState {
  switch (action.type) {
    case 'load-start':
      return { ...state, logsLoading: true, error: '' };
    case 'load-success':
      return {
        ...withSelectedLog(state, action.response),
        logsLoading: false,
        error: '',
      };
    case 'load-failure':
      return { ...state, logsLoading: false, error: action.error };
    case 'select-log':
      return { ...state, selectedLog: action.log };
    case 'retry-start':
      return {
        ...state,
        retryingId: action.logId,
        error: '',
        retryError: '',
        successMessage: '',
      };
    case 'retry-success':
      return {
        ...withSelectedLog(state, action.response),
        retryingId: null,
        retryError: '',
        successMessage: 'Permintaan retry berhasil dikirim.',
      };
    case 'retry-failure':
      return { ...state, retryingId: null, retryError: action.error };
    case 'reconcile-start':
      return { ...state, reconciliationLoading: true, reconciliationError: '' };
    case 'reconcile-success':
      return {
        ...state,
        reconciliation: action.report,
        reconciliationLoading: false,
        reconciliationError: '',
      };
    case 'reconcile-failure':
      return {
        ...state,
        reconciliationLoading: false,
        reconciliationError: action.error,
      };
  }
}

async function readApiError(
  response: Response,
  fallback: string,
): Promise<Error> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      code?: string;
      retryAfterAt?: string;
    };
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message;
    const error = new Error(message || fallback);
    if (payload.code) error.name = payload.code;
    if (payload.retryAfterAt) {
      error.message = `${error.message} Coba lagi setelah ${new Date(payload.retryAfterAt).toLocaleString('id-ID')}.`;
    }
    return error;
  } catch {
    return new Error(fallback);
  }
}

async function requestLogs(page = 1): Promise<SyncLogListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  const response = await apiFetch(
    `/api/integrations/SATUSEHAT/logs?${params.toString()}`,
  );
  if (!response.ok) {
    throw await readApiError(response, 'Log sinkronisasi tidak dapat dimuat.');
  }
  return response.json() as Promise<SyncLogListResponse>;
}

async function requestReconciliation(): Promise<IntegrationReconciliationResponse> {
  const response = await apiFetch(
    '/api/integrations/SATUSEHAT/reconciliation',
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw await readApiError(
      response,
      'Rekonsiliasi integrasi tidak dapat dijalankan.',
    );
  }
  return response.json() as Promise<IntegrationReconciliationResponse>;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSyncLogs(enabled = true) {
  const [state, dispatch] = useReducer(syncLogsReducer, initialState);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    async function loadInitialLogs() {
      try {
        const response = await requestLogs();
        if (active) dispatch({ type: 'load-success', response });
      } catch (error) {
        if (active) {
          dispatch({
            type: 'load-failure',
            error: messageFrom(error, 'Log sinkronisasi tidak dapat dimuat.'),
          });
        }
      }
    }

    void loadInitialLogs();
    return () => {
      active = false;
    };
  }, [enabled]);

  const refresh = useCallback(async (page = 1) => {
    if (!enabled) return;
    dispatch({ type: 'load-start' });
    try {
      dispatch({ type: 'load-success', response: await requestLogs(page) });
    } catch (error) {
      dispatch({
        type: 'load-failure',
        error: messageFrom(error, 'Log sinkronisasi tidak dapat dimuat.'),
      });
    }
  }, [enabled]);

  const retry = useCallback(async (logId: string, page = 1) => {
    if (!enabled) return;
    dispatch({ type: 'retry-start', logId });
    try {
      const response = await apiFetch(
        `/api/integrations/SATUSEHAT/logs/${logId}/retry`,
        { method: 'POST' },
      );
      if (!response.ok) {
        throw await readApiError(
          response,
          'Retry sinkronisasi tidak dapat dijalankan.',
        );
      }
      dispatch({
        type: 'retry-success',
        response: await requestLogs(page),
      });
    } catch (error) {
      dispatch({
        type: 'retry-failure',
        error: messageFrom(error, 'Retry sinkronisasi tidak dapat dijalankan.'),
      });
    }
  }, [enabled]);

  const reconcile = useCallback(async () => {
    if (!enabled) return;
    dispatch({ type: 'reconcile-start' });
    try {
      dispatch({
        type: 'reconcile-success',
        report: await requestReconciliation(),
      });
    } catch (error) {
      dispatch({
        type: 'reconcile-failure',
        error: messageFrom(
          error,
          'Rekonsiliasi integrasi tidak dapat dijalankan.',
        ),
      });
    }
  }, [enabled]);

  const selectLog = useCallback((log: SyncLog) => {
    dispatch({ type: 'select-log', log });
  }, []);

  return { ...state, refresh, retry, reconcile, selectLog };
}
