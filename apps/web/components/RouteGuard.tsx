'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AccessPermission } from '@mitrafaskes/shared';
import { can, getSession } from '@/lib/auth';

export function RouteGuard({
  permission,
  children,
}: {
  permission: AccessPermission;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!can(session.user, permission)) {
      router.replace(`/akses-ditolak?from=${encodeURIComponent(pathname)}`);
      return;
    }
    setAllowed(true);
  }, [pathname, permission, router]);

  return allowed ? <>{children}</> : null;
}
