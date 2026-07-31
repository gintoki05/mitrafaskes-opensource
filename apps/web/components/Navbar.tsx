'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, UserCheck, Stethoscope, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { AccessPermission, ROLE_LABELS } from '@mitrafaskes/shared';
import { can, clearSession, getSession, SessionUser } from '@/lib/auth';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSession()?.user ?? null);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  if (pathname === '/login') return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/90 bg-card/95 shadow-sm backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-primary shadow-sm shadow-primary/20">
              <Activity className="h-6 w-6 text-primary-foreground stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">
                Mitra Faskes
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary">
                Clinical RME & SATUSEHAT
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            {can(user, AccessPermission.QUEUE_READ) && <Link
              href="/pendaftaran"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/pendaftaran'
                  ? 'border border-primary/30 bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Pendaftaran & Antrean
            </Link>}

            {can(user, AccessPermission.RME_READ) && <Link
              href="/rme"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/rme'
                  ? 'border border-primary/30 bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              RME Dokter
            </Link>}

            {can(user, AccessPermission.SYNC_STATUS_READ) && <Link
              href="/satusehat"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/satusehat'
                  ? 'border border-primary/30 bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              SATUSEHAT Sync
            </Link>}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-foreground">{user.fullName}</div>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase text-primary">
                    <ShieldCheck className="w-3 h-3" />
                    {ROLE_LABELS[user.role]}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-[var(--radius-control)] p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/85"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
