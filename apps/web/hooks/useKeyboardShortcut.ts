'use client';

import { useEffect } from 'react';

export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === key.toLowerCase()) callback(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback, key]);
}
