'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { apiFetch } from '@/lib/auth';
import { SyncLog } from '@/lib/clinical-types';

type SyncLogsState = {
  logs: SyncLog[];
  selectedLog: SyncLog | null;
  logsLoading: boolean;
  retryingId: string | null;
  error: string;
  successMessage: string;
};

type SyncLogsAction =
  | { type: 'load-start' }
  | { type: 'load-success'; logs: SyncLog[] }
  | { type: 'load-failure'; error: string }
  | { type: 'select-log'; log: SyncLog }
  | { type: 'retry-start'; logId: string }
  | { type: 'retry-success'; logs: SyncLog[] }
  | { type: 'retry-failure'; error: string };

const initialState: SyncLogsState = {
  logs: [],
  selectedLog: null,
  logsLoading: true,
  retryingId: null,
  error: '',
  successMessage: '',
};

function withSelectedLog(state: SyncLogsState, logs: SyncLog[]): SyncLogsState {
  const selectedLog = state.selectedLog
    ? logs.find((log) => log.id === state.selectedLog?.id) ?? logs[0] ?? null
    : logs[0] ?? null;

  return { ...state, logs, selectedLog };
}

function syncLogsReducer(state: SyncLogsState, action: SyncLogsAction): SyncLogsState {
  switch (action.type) {
    case 'load-start':
      return { ...state, logsLoading: true, error: '' };
    case 'load-success':
      return { ...withSelectedLog(state, action.logs), logsLoading: false, error: '' };
    case 'load-failure':
      return { ...state, logsLoading: false, error: action.error };
    case 'select-log':
      return { ...state, selectedLog: action.log };
    case 'retry-start':
      return { ...state, retryingId: action.logId, error: '', successMessage: '' };
    case 'retry-success':
      return {
        ...withSelectedLog(state, action.logs),
        retryingId: null,
        error: '',
        successMessage: 'Permintaan retry berhasil dikirim.',
      };
    case 'retry-failure':
      return { ...state, retryingId: null, error: action.error };
  }
}

async function requestLogs(): Promise<SyncLog[]> {
  const response = await apiFetch('/api/satusehat/logs');
  if (!response.ok) throw new Error('Log sinkronisasi tidak dapat dimuat.');
  return response.json() as Promise<SyncLog[]>;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSyncLogs() {
  const [state, dispatch] = useReducer(syncLogsReducer, initialState);

  useEffect(() => {
    let active = true;

    async function loadInitialLogs() {
      try {
        const logs = await requestLogs();
        if (active) dispatch({ type: 'load-success', logs });
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
  }, []);

  const refresh = useCallback(async () => {
    dispatch({ type: 'load-start' });
    try {
      dispatch({ type: 'load-success', logs: await requestLogs() });
    } catch (error) {
      dispatch({
        type: 'load-failure',
        error: messageFrom(error, 'Log sinkronisasi tidak dapat dimuat.'),
      });
    }
  }, []);

  const retry = useCallback(async (logId: string) => {
    dispatch({ type: 'retry-start', logId });
    try {
      const response = await apiFetch(
        `/api/satusehat/sync/${logId}/retry`,
        { method: 'POST' },
      );
      if (!response.ok) throw new Error('Retry sinkronisasi tidak dapat dijalankan.');
      dispatch({ type: 'retry-success', logs: await requestLogs() });
    } catch (error) {
      dispatch({
        type: 'retry-failure',
        error: messageFrom(error, 'Retry sinkronisasi tidak dapat dijalankan.'),
      });
    }
  }, []);

  const selectLog = useCallback((log: SyncLog) => {
    dispatch({ type: 'select-log', log });
  }, []);

  return { ...state, refresh, retry, selectLog };
}
