'use client';

import { useSyncExternalStore } from 'react';
import { getSession, Session, subscribeToSession } from '@/lib/auth';

type SessionSnapshot = Session | null | undefined;

const getServerSnapshot = (): null => null;

export function useSession(): SessionSnapshot {
  return useSyncExternalStore<SessionSnapshot>(
    subscribeToSession,
    getSession,
    getServerSnapshot,
  );
}
