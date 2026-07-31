import React from 'react';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata = {
  title: 'Mitra Faskes - Rekam Medis Elektronik (RME) & SATUSEHAT',
  description: 'Aplikasi Rekam Medis Elektronik (RME) Open Source Terintegrasi SATUSEHAT Kemenkes RI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex min-h-screen min-w-0 flex-col overflow-x-clip">
        <a
          href="#konten-utama"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
        >
          Lewati ke konten utama
        </a>
        <Navbar />
        <main
          id="konten-utama"
          className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6 lg:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
