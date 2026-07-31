'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { defaultRoute, getSession, SessionUser } from '@/lib/auth';

export default function AccessDeniedPage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSession()?.user ?? null);
  }, []);

  if (!user) return null;

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-8 text-center shadow-lg">
      <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
      <h1 className="text-xl font-bold text-foreground">Akses ditolak</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Peran Anda tidak memiliki izin untuk membuka halaman atau menjalankan tindakan tersebut.
      </p>
      <Link
        href={defaultRoute(user)}
        className="mt-6 inline-flex rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85"
      >
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
