'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Building2,
  Database,
  ChevronDown,
  HelpCircle,
  HeartPulse,
  History,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Settings2,
  type LucideIcon,
  UserCheck,
} from 'lucide-react';
import { AccessPermission, ROLE_LABELS } from '@mitrafaskes/shared';
import { apiFetch, can, clearSession, defaultRoute } from '@/lib/auth';
import { useSession } from '@/hooks/useSession';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SatusehatConnectionBadge } from '@/components/SatusehatConnectionBadge';

type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  permission: AccessPermission;
  icon: LucideIcon;
  provider?: string;
  children?: readonly {
    href: string;
    label: string;
    exact?: boolean;
  }[];
};

const navigationItems: readonly NavigationItem[] = [
  {
    href: '/pendaftaran',
    label: 'Pendaftaran',
    shortLabel: 'Pendaftaran',
    permission: AccessPermission.QUEUE_READ,
    icon: UserCheck,
  },
  {
    href: '/riwayat-kunjungan',
    label: 'Riwayat Kunjungan',
    shortLabel: 'Riwayat',
    permission: AccessPermission.QUEUE_READ,
    icon: History,
  },
  {
    href: '/rme',
    label: 'Pemeriksaan Dokter',
    shortLabel: 'Dokter',
    permission: AccessPermission.RME_READ,
    icon: Stethoscope,
  },
  {
    href: '/triase',
    label: 'Triase Perawat',
    shortLabel: 'Triase',
    permission: AccessPermission.RME_TRIAGE_READ,
    icon: HeartPulse,
  },
  {
    href: '/master-data',
    label: 'Master Data',
    shortLabel: 'Master Data',
    permission: AccessPermission.MASTER_DATA_READ,
    icon: Database,
    children: [
      { href: '/master-data', label: 'Ikhtisar dataset', exact: true },
      { href: '/master-data/wilayah', label: 'Master Wilayah' },
      { href: '/master-data/icd10', label: 'Katalog ICD-10' },
    ],
  },
  {
    href: '/master-faskes',
    label: 'Master Faskes',
    shortLabel: 'Master',
    permission: AccessPermission.MASTER_DATA_READ,
    icon: Building2,
    children: [
      { href: '/master-faskes', label: 'Ikhtisar struktur', exact: true },
      { href: '/master-faskes/organisasi', label: 'Organisasi / Faskes' },
      { href: '/master-faskes/lokasi', label: 'Ruangan pelayanan' },
      { href: '/master-faskes/practitioner', label: 'Tenaga kesehatan' },
    ],
  },
  {
    href: '/satusehat',
    label: 'Monitoring SATUSEHAT',
    shortLabel: 'SATUSEHAT',
    permission: AccessPermission.SYNC_STATUS_READ,
    icon: RefreshCw,
    provider: 'SATUSEHAT',
  },
  {
    href: '/administrasi/akun',
    label: 'Administrasi Akses',
    shortLabel: 'Akun',
    permission: AccessPermission.ACCOUNT_READ,
    icon: Settings2,
    children: [
      { href: '/administrasi/akun', label: 'Akun pengguna' },
      { href: '/administrasi/role', label: 'Role & izin' },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const user = session?.user ?? null;
  const organizationLabel = user?.organization
    ? `${user.organization.code} · ${user.organization.name}`
    : 'Organization belum ditetapkan';
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [navigationQuery, setNavigationQuery] = useState('');

  const handleLogout = () => {
    void apiFetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      clearSession();
      router.replace('/login');
    });
  };

  if (pathname === '/login' || pathname === '/wajib-ganti-password') return null;

  const availableNavigation = navigationItems.filter(
    (item) =>
      can(user, item.permission) &&
      (!item.provider || satusehat.available),
  );
  const normalizedNavigationQuery = navigationQuery.trim().toLocaleLowerCase();
  const visibleNavigation = normalizedNavigationQuery
    ? availableNavigation.filter((item) =>
        [item.label, item.shortLabel, ...(item.children?.map((child) => child.label) ?? [])]
          .some((label) => label.toLocaleLowerCase().includes(normalizedNavigationQuery)),
      )
    : availableNavigation;

  return (
    <>
      <aside
        data-sidebar-state={state}
        data-state={state}
        data-collapsible={collapsed ? 'icon' : undefined}
        className="app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/15 transition-[width] duration-200 ease-linear lg:flex"
      >
        <div className={`border-b border-white/15 py-5 ${collapsed ? 'px-2' : 'px-5'}`}>
          <Link
            href={user ? defaultRoute(user) : '/login'}
            className={`flex items-center gap-3 rounded-[var(--radius-control)] ${collapsed ? 'justify-center' : ''}`}
            aria-label="Mitra Faskes, halaman utama"
            title={collapsed ? 'Mitra Faskes' : undefined}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
              <Activity className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
            </span>
            <span className={`min-w-0 ${collapsed ? 'sr-only' : ''}`}>
              <span className="block truncate text-base font-bold tracking-tight text-white">Mitra Faskes</span>
              <span className="block truncate text-xs font-medium text-sidebar-muted">
                RME
              </span>
            </span>
          </Link>
        </div>

        <div className={`py-4 ${collapsed ? 'px-2' : 'px-4'}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-9 w-full items-center justify-center rounded-full bg-white text-primary transition-colors hover:bg-sidebar-active"
              aria-label="Buka sidebar untuk mencari fitur"
              title="Buka sidebar untuk mencari fitur"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <label className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs text-muted-foreground">
              <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="sr-only">Cari fitur</span>
              <input
                aria-label="Cari fitur"
                placeholder="Cari fitur di sini"
                value={navigationQuery}
                onChange={(event) => setNavigationQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3" aria-label="Navigasi utama">
          <p className={collapsed ? 'sr-only' : 'px-3 pb-2 text-xs font-semibold text-sidebar-muted'}>Menu utama</p>
          <div className="space-y-1">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children);
              const hasActiveChild =
                item.children?.some(
                  (child) =>
                    pathname === child.href ||
                    (!child.exact && pathname.startsWith(`${child.href}/`)),
                ) ?? false;
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                hasActiveChild;
              const isOpen = openSections[item.href] ?? active;

              return (
                <Collapsible
                  key={item.href}
                  open={hasChildren ? isOpen : undefined}
                  onOpenChange={(nextOpen: boolean) => {
                    if (!hasChildren) return;
                    setOpenSections((current) => ({
                      ...current,
                      [item.href]: nextOpen,
                    }));
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? 'page' : undefined}
                      aria-label={item.label}
                      title={collapsed ? item.label : undefined}
                      className={`flex min-h-10 min-w-0 flex-1 items-center rounded-[var(--radius-control)] text-sm font-semibold transition-colors ${
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                      } ${
                        active
                          ? 'bg-sidebar-active text-sidebar-active-foreground'
                          : 'text-sidebar-foreground/90 hover:bg-white/12 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                    </Link>
                    {hasChildren && !collapsed ? (
                      <CollapsibleTrigger
                        type="button"
                        aria-label={`${isOpen ? 'Tutup' : 'Buka'} submenu ${item.label}`}
                        aria-expanded={isOpen}
                        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-sidebar-muted transition-colors hover:bg-white/12 hover:text-white"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </CollapsibleTrigger>
                    ) : null}
                  </div>
                  {hasChildren && !collapsed ? (
                    <CollapsibleContent className="ml-7 mt-1 space-y-1 border-l border-white/15 pl-2">
                      {item.children?.map((child) => {
                        const childActive =
                          pathname === child.href ||
                          (!child.exact && pathname.startsWith(`${child.href}/`));
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childActive ? 'page' : undefined}
                            className={`flex min-h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors ${
                              childActive
                                ? 'bg-sidebar-active text-sidebar-active-foreground'
                                : 'text-sidebar-foreground/80 hover:bg-white/12 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  ) : null}
                </Collapsible>
              );
            })}
            {normalizedNavigationQuery && visibleNavigation.length === 0 ? (
              <p className="px-3 py-3 text-xs leading-relaxed text-sidebar-muted">
                Menu tidak ditemukan.
              </p>
            ) : null}
          </div>
        </nav>

        <div className={`border-t border-white/15 py-4 ${collapsed ? 'px-2' : 'px-4'}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="mb-3 flex h-8 w-full items-center justify-center rounded-[var(--radius-control)] text-sidebar-muted transition-colors hover:bg-white/12 hover:text-white"
              aria-label="Buka sidebar untuk bantuan sistem"
              title="Buka sidebar untuk bantuan sistem"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <div className="mb-3 flex items-center gap-2 px-2 text-sm text-sidebar-muted">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              Bantuan sistem
            </div>
          )}
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className={`flex min-h-10 w-full items-center rounded-[var(--radius-control)] text-sm font-semibold text-white/90 transition-colors hover:bg-white/12 hover:text-white ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              }`}
              aria-label={`Keluar dari akun ${user.fullName}`}
              title={collapsed ? 'Keluar' : undefined}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : ''}>Keluar</span>
            </button>
          ) : (
            <Link
              href="/login"
              className={`flex min-h-10 w-full items-center rounded-[var(--radius-control)] text-sm font-semibold text-white/90 transition-colors hover:bg-white/12 hover:text-white ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              }`}
              aria-label="Masuk ke sistem"
              title={collapsed ? 'Masuk' : undefined}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : ''}>Masuk</span>
            </Link>
          )}
        </div>
      </aside>

      <header className="app-topbar fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/15 px-4 shadow-sm transition-[left] duration-200 ease-linear sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 lg:hidden">
            <Activity className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <SidebarTrigger className="hidden lg:inline-flex" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Klinik Mitra Sehat</p>
            <p className="truncate text-xs text-white/70">Ruang kerja operasional klinik</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {can(user, AccessPermission.SYNC_STATUS_READ) && satusehat.available ? (
            <SatusehatConnectionBadge />
          ) : null}
          {user ? (
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-primary">
                {user.fullName.slice(0, 2).toUpperCase()}
              </span>
              <div className="w-48 min-w-0 text-left">
                <div className="truncate text-xs font-bold text-white">{user.fullName}</div>
                <div className="flex w-full items-center justify-start gap-1 text-xs text-white/70">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  <span className="truncate">{user.accessRole?.name ?? ROLE_LABELS[user.role]}</span>
                </div>
                <div
                  className="flex w-full items-center justify-start gap-1 text-[11px] text-white/70"
                  title={`Organization pengguna: ${organizationLabel}`}
                >
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Organization pengguna: </span>
                  <span className="truncate">{organizationLabel}</span>
                </div>
              </div>
            </div>
          ) : null}
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-white transition-colors hover:bg-white/12"
              aria-label={`Keluar dari akun ${user.fullName}`}
              title="Keluar"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <Link
              href="/login"
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-white transition-colors hover:bg-white/12"
              aria-label="Masuk ke sistem"
              title="Masuk"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </header>

      <nav className="fixed inset-x-0 top-16 z-20 flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:hidden" aria-label="Navigasi cepat">
        {availableNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-medium ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
