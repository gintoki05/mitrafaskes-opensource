'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Clock3, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RegistrationView = 'patients' | 'queue';

type RegistrationViewTabsProps = {
  activeView: RegistrationView;
  patientCount: number;
  queueCount: number;
  onChange: (view: RegistrationView) => void;
};

const viewTabs: readonly {
  id: RegistrationView;
  label: string;
  description: string;
  countNoun: string;
  icon: typeof UsersRound;
}[] = [
  {
    id: 'patients',
    label: 'Data pasien',
    description: 'Pasien terdaftar',
    countNoun: 'pasien',
    icon: UsersRound,
  },
  {
    id: 'queue',
    label: 'Antrean aktif',
    description: 'Kunjungan belum selesai',
    countNoun: 'antrean',
    icon: Clock3,
  },
];

export function RegistrationViewTabs({
  activeView,
  patientCount,
  queueCount,
  onChange,
}: RegistrationViewTabsProps) {
  const tabRefs = useRef<Record<RegistrationView, HTMLButtonElement | null>>({
    patients: null,
    queue: null,
  });
  const counts = { patients: patientCount, queue: queueCount } satisfies Record<RegistrationView, number>;

  const selectView = (view: RegistrationView, focus = false) => {
    onChange(view);

    if (focus) {
      window.requestAnimationFrame(() => tabRefs.current[view]?.focus());
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentView: RegistrationView) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = viewTabs.findIndex((tab) => tab.id === currentView);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? viewTabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + viewTabs.length) % viewTabs.length;
    selectView(viewTabs[nextIndex].id, true);
  };

  return (
    <div className="data-surface p-1" role="tablist" aria-label="Bagian pendaftaran">
      <div className="grid gap-1 sm:grid-cols-2">
        {viewTabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeView === tab.id;

          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.id] = element;
              }}
              id={`registration-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`registration-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectView(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, tab.id)}
              className={cn(
                'flex min-h-[3.25rem] min-w-0 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 sm:px-4',
                selected
                  ? 'bg-primary/10 text-foreground ring-1 ring-inset ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)]',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-primary/8 text-primary',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-bold">{tab.label}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                      selected ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground',
                    )}
                  >
                    {counts[tab.id]} {tab.countNoun}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
