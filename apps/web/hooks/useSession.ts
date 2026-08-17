'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  ensureSessionLoaded,
  getSession,
  Session,
  subscribeToSession,
} from '@/lib/auth';

type SessionSnapshot = Session | null | undefined;

const getServerSnapshot = (): null => null;

export function useSession(): SessionSnapshot {
  useEffect(() => {
    void ensureSessionLoaded();
  }, []);

  return useSyncExternalStore<SessionSnapshot>(
    subscribeToSession,
    getSession,
    getServerSnapshot,
  );
}
