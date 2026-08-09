"use client";

import Link from "next/link";
import { Database, MapPinned } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/master-data", label: "Ikhtisar dataset", icon: Database },
  { href: "/master-data/wilayah", label: "Master Wilayah", icon: MapPinned },
] as const;

export function MasterDataSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-[var(--radius-card)] border border-border bg-card p-1 lg:hidden"
      aria-label="Navigasi Master Data"
    >
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-semibold transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
