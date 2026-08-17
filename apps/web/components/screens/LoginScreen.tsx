'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity,
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, defaultRoute, setSession } from '@/lib/auth';
import { getLastRoute } from '@/lib/route-state';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getSessionEntryRoute(user: Parameters<typeof defaultRoute>[0]): string {
  return getLastRoute(user) ?? defaultRoute(user);
}
export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'admin123',
    },
  });

  useEffect(() => {
    if (session) router.replace(session.user.mustChangePassword ? '/wajib-ganti-password' : getSessionEntryRoute(session.user));
  }, [router, session]);

  const handleLogin: SubmitHandler<LoginFormValues> = async ({ username, password }) => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        let serverMessage = '';
        try {
          const errData = (await res.json()) as { message?: string | string[] };
          serverMessage = Array.isArray(errData.message)
            ? errData.message.join(' ')
            : errData.message ?? '';
        } catch {
          // Use the status-specific fallback when the API has no JSON body.
        }
        const isGenericThrottleMessage = /ThrottlerException|Too Many Requests/i.test(
          serverMessage,
        );
        const message =
          res.status === 429 && (!serverMessage || isGenericThrottleMessage)
            ? 'Batas percobaan login tercapai. Maksimal 7 percobaan dalam 7 menit. Coba lagi setelah batas waktu berakhir.'
            : serverMessage || 'Login gagal';
        throw new Error(message);
      }

      const data = await res.json();
      setSession(data.user);
      router.replace(data.user.mustChangePassword ? '/wajib-ganti-password' : getSessionEntryRoute(data.user));
    } catch (err: unknown) {
      toast.error('Tidak dapat masuk', {
        description:
          err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.',
        duration: 7000,
      });
    }
  };

  const selectQuickUser = (user: string, pass: string) => {
    setValue('username', user, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  return (
    <div className="login-screen grid w-full min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-[0_18px_45px_hsl(var(--foreground)/0.08)] lg:grid-cols-[minmax(19rem,0.78fr)_minmax(28rem,1.22fr)]">
      <section className="login-brand-panel flex min-h-[18rem] flex-col justify-between bg-[hsl(var(--sidebar-background))] p-6 text-sidebar-foreground sm:p-8 lg:min-h-0 lg:p-10" aria-label="Tentang Mitra Faskes">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <Activity className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Mitra Faskes</p>
              <p className="text-xs text-sidebar-foreground/75">Rekam Medis Elektronik</p>
            </div>
          </div>

          <div className="mt-12 max-w-sm lg:mt-20">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
              Satu alur untuk setiap kunjungan.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-sidebar-foreground/80">
              Kelola pendaftaran, antrean, pemeriksaan dokter, dan integrasi opsional dari ruang kerja yang sama.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-sidebar-foreground/20 pt-5">
          <div className="flex items-start gap-3 text-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <p className="font-semibold">Akses berbasis peran</p>
              <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">Menu dan tindakan mengikuti tanggung jawab setiap pengguna fasilitas.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-col justify-center bg-card p-6 sm:p-10 lg:p-14" aria-labelledby="login-title">
        <div className="mx-auto w-full max-w-md">
          <div>
            <h2 id="login-title" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Masuk ke sistem</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Gunakan akun fasilitas kesehatan Anda untuk melanjutkan pekerjaan.</p>
          </div>

          <form onSubmit={handleSubmit(handleLogin)} className="mt-8 space-y-5" noValidate>
            <Field data-invalid={Boolean(errors.username)}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <input
                {...register('username')}
                id="username"
                type="text"
                autoComplete="username"
                className="clinical-field min-h-11 w-full px-3.5 text-sm transition-colors focus-visible:border-ring"
                aria-invalid={Boolean(errors.username)}
                aria-describedby="username-error"
              />
              <FieldError id="username-error" errors={[errors.username]} />
            </Field>

            <Field data-invalid={Boolean(errors.password)}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <span className="text-xs text-muted-foreground">Akun internal fasilitas</span>
              </div>
              <PasswordInput
                {...register('password')}
                id="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-error"
              />
              <FieldError id="password-error" errors={[errors.password]} />
            </Field>

            <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="w-full">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Memproses...' : 'Masuk ke sistem'}
              {!isSubmitting ? <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" /> : null}
            </Button>
          </form>

          <div className="mt-9 border-t border-border pt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Akun demo</span>
              <span className="text-sm text-muted-foreground">Klik untuk mengisi</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-1">
              <button
                type="button"
                onClick={() => selectQuickUser('admin', 'admin123')}
                className="group rounded-[var(--radius-control)] border border-border bg-background p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  Admin
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Siti Rahma · Operasi</div>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
