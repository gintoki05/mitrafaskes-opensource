'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, UserCheck, Stethoscope, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mitrafaskes_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mitrafaskes_user');
    localStorage.removeItem('mitrafaskes_token');
    router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Mitra Faskes
              </span>
              <span className="block text-[10px] tracking-wider text-teal-400 font-semibold uppercase">
                Clinical RME & SATUSEHAT
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <Link
              href="/pendaftaran"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/pendaftaran'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-md shadow-teal-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Pendaftaran & Antrean
            </Link>

            <Link
              href="/rme"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/rme'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-md shadow-teal-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              RME Dokter
            </Link>

            <Link
              href="/satusehat"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                pathname === '/satusehat'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-md shadow-teal-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              SATUSEHAT Sync
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-200">{user.fullName}</div>
                  <div className="text-[10px] text-teal-400 flex items-center justify-end gap-1 font-semibold uppercase">
                    <ShieldCheck className="w-3 h-3" />
                    {user.role}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
