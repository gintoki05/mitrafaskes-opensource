'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  UserCheck,
  Stethoscope,
  RefreshCw,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { AccessPermission, ROLE_LABELS } from '@mitrafaskes/shared';
import { can, clearSession, defaultRoute } from '@/lib/auth';
import { useSession } from '@/hooks/useSession';

const navigationItems = [
  {
    href: '/pendaftaran',
    label: 'Pendaftaran & Antrean',
    shortLabel: 'Pendaftaran',
    permission: AccessPermission.QUEUE_READ,
    icon: UserCheck,
  },
  {
    href: '/rme',
    label: 'RME Dokter',
    shortLabel: 'RME',
    permission: AccessPermission.RME_READ,
    icon: Stethoscope,
  },
  {
    href: '/satusehat',
    label: 'Monitoring SATUSEHAT',
    shortLabel: 'SATUSEHAT',
    permission: AccessPermission.SYNC_STATUS_READ,
    icon: RefreshCw,
  },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const user = session?.user ?? null;

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  if (pathname === '/login') return null;

  const availableNavigation = navigationItems.filter((item) => can(user, item.permission));

  return (
    <header className="sticky top-0 z-50 border-b border-border/90 bg-card/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex min-w-0 max-w-7xl flex-wrap items-center gap-x-4 px-4 py-2 sm:px-6 lg:flex-nowrap lg:px-8">
        <Link
          href={user ? defaultRoute(user) : '/login'}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-control)] lg:flex-none"
          aria-label="Mitra Faskes, halaman utama"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary shadow-sm shadow-primary/20">
            <Activity className="h-6 w-6 text-primary-foreground stroke-[2.5]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-foreground sm:text-lg">
              Mitra Faskes
            </span>
            <span className="block truncate text-[9px] font-semibold uppercase tracking-wider text-primary sm:text-[10px]">
              Clinical RME & SATUSEHAT
            </span>
          </span>
        </Link>

        {availableNavigation.length > 0 ? (
          <nav
            className="order-last mt-2 flex w-full min-w-0 flex-wrap gap-2 border-t border-border pt-2 lg:order-none lg:mt-0 lg:flex-1 lg:justify-center lg:border-0 lg:pt-0"
            aria-label="Navigasi utama"
          >
            {availableNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-10 min-w-0 flex-1 basis-36 items-center justify-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-xs font-bold transition-colors sm:basis-auto lg:flex-none ${
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                      : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate sm:hidden">{item.shortLabel}</span>
                  <span className="hidden truncate sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="flex min-w-0 items-center gap-2">
          {user ? (
            <>
              <div className="min-w-0 max-w-32 text-right sm:max-w-48">
                <div className="truncate text-xs font-bold text-foreground">{user.fullName}</div>
                <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase text-primary">
                  <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ROLE_LABELS[user.role]}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-[var(--radius-control)] p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Keluar dari akun ${user.fullName}`}
                title="Keluar"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
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
    </header>
  );
}
