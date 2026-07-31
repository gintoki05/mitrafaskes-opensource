'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, UserCheck, Stethoscope, Lock } from 'lucide-react';
import { defaultRoute, getSession, saveSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('dr_budi');
  const [password, setPassword] = useState('dok123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) router.replace(defaultRoute(session.user));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Login gagal');
      }

      const data = await res.json();
      saveSession(data.accessToken, data.user);
      router.replace(defaultRoute(data.user));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectQuickUser = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-panel)] border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[var(--radius-panel)] bg-primary shadow-md shadow-primary/20">
            <Activity className="h-8 w-8 text-primary-foreground stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Mitra Faskes RME
          </h1>
        </div>

        {error && (
          <div className="clinical-status-error mb-4 rounded-[var(--radius-card)] border p-3 text-center text-xs font-medium" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="clinical-field w-full px-4 py-2.5 text-sm transition-colors focus-visible:border-ring"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="clinical-field w-full px-4 py-2.5 text-sm transition-colors focus-visible:border-ring"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/85 disabled:bg-muted disabled:text-muted-foreground"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Proses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div className="mt-8 border-t border-border pt-6">
          <span className="mb-3 block text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Akun Demo Praktis (Klik untuk Mengisi)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => selectQuickUser('admin', 'admin123')}
              className="group rounded-[var(--radius-card)] border border-border bg-background p-2.5 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <UserCheck className="w-3.5 h-3.5" /> Admin
              </div>
              <div className="truncate text-[11px] text-muted-foreground">Siti Rahma (Pendaftaran)</div>
            </button>

            <button
              onClick={() => selectQuickUser('dr_budi', 'dok123')}
              className="group rounded-[var(--radius-card)] border border-border bg-background p-2.5 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-success">
                <Stethoscope className="w-3.5 h-3.5" /> Dokter
              </div>
              <div className="truncate text-[11px] text-muted-foreground">dr. Budi Santoso</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
