'use client';

import Link from 'next/link';
import { defaultRoute } from '@/lib/auth';
import { ScreenState } from '@/components/ScreenState';
import { useSession } from '@/hooks/useSession';

export default function AccessDeniedPage() {
  const session = useSession();

  if (session === undefined) {
    return (
      <ScreenState
        kind="loading"
        title="Memeriksa sesi"
        description="Menyiapkan tujuan kembali yang aman."
        className="mx-auto mt-12 max-w-xl"
      />
    );
  }

  if (!session) {
    return (
      <div className="mx-auto mt-12 max-w-xl">
        <ScreenState
          kind="error"
          title="Sesi tidak ditemukan"
          description="Silakan masuk kembali untuk membuka halaman yang sesuai dengan peran Anda."
          action={
            <Link
              href="/login"
              className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Ke halaman masuk
            </Link>
          }
        />
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="mx-auto mt-12 max-w-xl">
      <ScreenState
        kind="error"
        title="Akses ditolak"
        description="Peran Anda tidak memiliki izin untuk membuka halaman atau menjalankan tindakan tersebut."
        action={
          <Link
            href={defaultRoute(user)}
            className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            Kembali ke halaman utama
          </Link>
        }
      />
    </div>
  );
}
