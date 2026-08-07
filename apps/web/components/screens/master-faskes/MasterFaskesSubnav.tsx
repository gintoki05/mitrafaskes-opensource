'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Layers3, MapPin, Network, Stethoscope } from 'lucide-react';

const links = [
  {
    href: '/master-faskes',
    label: 'Ikhtisar struktur',
    icon: Network,
  },
  {
    href: '/master-faskes/organisasi',
    label: 'Organisasi / Faskes',
    icon: Building2,
  },
  {
    href: '/master-faskes/lokasi',
    label: 'Location / Ruangan',
    icon: MapPin,
  },
  {
    href: '/master-faskes/practitioner',
    label: 'Practitioner / Nakes',
    icon: Stethoscope,
  },
  {
    href: '/master-faskes/unit-layanan',
    label: 'Unit layanan / Poli',
    icon: Layers3,
  },
] as const;

export function MasterFaskesSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-[var(--radius-card)] border border-border bg-card p-1 lg:hidden"
      aria-label="Navigasi Master Faskes"
    >
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-semibold transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
