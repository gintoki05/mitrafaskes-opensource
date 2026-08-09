'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { rememberLastRoute } from '@/lib/route-state';

export function RoutePersistence() {
  const pathname = usePathname();
  const session = useSession();

  useEffect(() => {
    if (!session || !pathname) return;

    rememberLastRoute(session.user, pathname);
  }, [pathname, session]);

  return null;
}
