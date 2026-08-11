'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AccessPermission } from '@mitrafaskes/shared';
import { can } from '@/lib/auth';
import { ScreenState } from '@/components/ScreenState';
import { useSession } from '@/hooks/useSession';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

export function RouteGuard({
  permission,
  integrationProvider,
  children,
}: {
  permission: AccessPermission;
  integrationProvider?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const integration = useIntegrationCapability(integrationProvider ?? '');
  const isCheckingSession = session === undefined;
  const isAllowed = Boolean(
    session &&
      can(session.user, permission) &&
      (!integrationProvider || integration.available),
  );

  useEffect(() => {
    if (isCheckingSession) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!can(session.user, permission)) {
      router.replace(`/akses-ditolak?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (integrationProvider && !integration.loading && !integration.available) {
      router.replace('/master-faskes');
    }
  }, [
    integration.available,
    integration.loading,
    integrationProvider,
    isCheckingSession,
    pathname,
    permission,
    router,
    session,
  ]);

  return isAllowed ? (
    <>{children}</>
  ) : (
    <ScreenState
      kind="loading"
      title={integrationProvider ? 'Memeriksa integrasi' : 'Memeriksa akses'}
      description={
        integrationProvider
          ? 'Capability integrasi sedang diverifikasi.'
          : 'Sesi dan izin halaman sedang diverifikasi.'
      }
      className="mx-auto max-w-2xl"
    />
  );
}
