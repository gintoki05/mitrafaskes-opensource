'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, UserCheck, Stethoscope, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('dr_budi');
  const [password, setPassword] = useState('dok123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      localStorage.setItem('mitrafaskes_token', data.accessToken);
      localStorage.setItem('mitrafaskes_user', JSON.stringify(data.user));

      if (data.user.role === 'ADMIN' || data.user.role === 'PERAWAT') {
        router.push('/pendaftaran');
      } else {
        router.push('/rme');
      }
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
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-xl shadow-teal-500/20 mb-3">
            <Activity className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Mitra Faskes RME
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Rekam Medis Elektronik (Next.js & NestJS API)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500 text-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500 text-sm transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Proses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
            Akun Demo Praktis (Klik untuk Mengisi)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => selectQuickUser('admin', 'admin123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                <UserCheck className="w-3.5 h-3.5" /> Admin
              </div>
              <div className="text-[11px] text-slate-400 truncate">Siti Rahma (Pendaftaran)</div>
            </button>

            <button
              onClick={() => selectQuickUser('dr_budi', 'dok123')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Stethoscope className="w-3.5 h-3.5" /> Dokter
              </div>
              <div className="text-[11px] text-slate-400 truncate">dr. Budi Santoso</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
