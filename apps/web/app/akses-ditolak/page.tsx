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
    <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-rose-500/30 bg-slate-900 p-8 text-center shadow-xl">
      <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-rose-400" />
      <h1 className="text-xl font-bold text-white">Akses ditolak</h1>
      <p className="mt-2 text-sm text-slate-400">
        Peran Anda tidak memiliki izin untuk membuka halaman atau menjalankan tindakan tersebut.
      </p>
      <Link
        href={defaultRoute(user)}
        className="mt-6 inline-flex rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-teal-400"
      >
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
