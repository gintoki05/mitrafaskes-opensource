'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AccessPermission } from '@mitrafaskes/shared';
import { can } from '@/lib/auth';
import { ScreenState } from '@/components/ScreenState';
import { useSession } from '@/hooks/useSession';

export function RouteGuard({
  permission,
  children,
}: {
  permission: AccessPermission;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const isCheckingSession = session === undefined;
  const isAllowed = Boolean(session && can(session.user, permission));

  useEffect(() => {
    if (isCheckingSession) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!can(session.user, permission)) {
      router.replace(`/akses-ditolak?from=${encodeURIComponent(pathname)}`);
    }
  }, [isCheckingSession, pathname, permission, router, session]);

  return isAllowed ? (
    <>{children}</>
  ) : (
    <ScreenState
      kind="loading"
      title="Memeriksa akses"
      description="Sesi dan izin halaman sedang diverifikasi."
      className="mx-auto max-w-2xl"
    />
  );
}
