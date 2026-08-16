'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function AccountDialog({ open, title, onClose, children, className = 'max-w-3xl' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('input, select, button, [tabindex="0"]')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); } };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/35 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto ${className}`}>
        {children}
      </div>
    </div>
  );
}
