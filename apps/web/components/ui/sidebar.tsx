'use client';

import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'mitrafaskes.sidebar.open';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarState = 'expanded' | 'collapsed';

type SidebarContextValue = {
  open: boolean;
  state: SidebarState;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function persistSidebarState(open: boolean) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  } catch {
    // Persistence is a convenience; the sidebar still works when storage is unavailable.
  }
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (openProp === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    persistSidebarState(nextOpen);
  }, [onOpenChange, openProp]);

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  React.useEffect(() => {
    if (openProp !== undefined) return;

    let storedState: boolean | null = null;

    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === 'true' || stored === 'false') {
        storedState = stored === 'true';
      }
    } catch {
      // The default state remains the fallback when storage is unavailable.
    }

    if (storedState === null) return;

    const timeoutId = window.setTimeout(() => {
      setUncontrolledOpen(storedState);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [openProp]);

  React.useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [toggleSidebar]);

  React.useEffect(() => {
    document.body.dataset.sidebarState = open ? 'expanded' : 'collapsed';

    return () => {
      delete document.body.dataset.sidebarState;
    };
  }, [open]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      state: open ? 'expanded' : 'collapsed',
      setOpen,
      toggleSidebar,
    }),
    [open, setOpen, toggleSidebar],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

export function SidebarTrigger({
  className,
  onClick,
  title,
  'aria-label': ariaLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggleSidebar } = useSidebar();
  const label = open ? 'Ciutkan sidebar' : 'Buka sidebar';
  const Icon = open ? PanelLeftClose : PanelLeftOpen;

  return (
    <button
      {...props}
      type="button"
      data-slot="sidebar-trigger"
      data-state={open ? 'expanded' : 'collapsed'}
      aria-label={ariaLabel ?? label}
      title={title ?? `${label} (Ctrl+B / Cmd+B)`}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented) toggleSidebar();
      }}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-white/85 transition-colors hover:bg-white/12 hover:text-white focus-visible:ring-white/60',
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
