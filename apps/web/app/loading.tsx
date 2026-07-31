import { ScreenState } from '@/components/ScreenState';

export default function Loading() {
  return (
    <ScreenState
      kind="loading"
      title="Menyiapkan halaman"
      description="Struktur layar dan data dasar sedang dimuat."
      className="mx-auto max-w-2xl"
    />
  );
}
