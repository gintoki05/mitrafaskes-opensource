'use client';

import { useSyncExternalStore } from 'react';
import { getSession, Session, subscribeToSession } from '@/lib/auth';

type SessionSnapshot = Session | null | undefined;

const getServerSnapshot = (): undefined => undefined;

export function useSession(): SessionSnapshot {
  return useSyncExternalStore<SessionSnapshot>(
    subscribeToSession,
    getSession,
    getServerSnapshot,
  );
}
