'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VISIBILITY_THRESHOLD = 480;

export function RmeBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY > VISIBILITY_THRESHOLD);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  if (!visible) return null;

  const handleClick = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    window.scrollTo({ top: 0, behavior });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="fixed right-5 bottom-5 z-30 min-h-11 rounded-full bg-card px-3 shadow-sm print:hidden sm:min-h-8 sm:rounded-[var(--radius-control)]"
      onClick={handleClick}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
    >
      <ArrowUp className="size-4" aria-hidden="true" />
      Kembali ke atas
    </Button>
  );
}
