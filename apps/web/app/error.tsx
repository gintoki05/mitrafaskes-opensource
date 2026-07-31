'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScreenState } from '@/components/ScreenState';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ScreenState
      kind="error"
      title="Halaman tidak dapat ditampilkan"
      description="Terjadi kendala saat menyiapkan layar. Coba muat ulang bagian ini."
      action={<Button onClick={reset}>Coba lagi</Button>}
      className="mx-auto max-w-2xl"
    />
  );
}
