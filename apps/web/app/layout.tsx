import React from 'react';
import './globals.css';
import { Navbar } from '../components/Navbar';
import { SidebarProvider } from '../components/ui/sidebar';
import { Toaster } from '../components/ui/sonner';

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
      <body className="app-frame flex min-h-screen min-w-0 flex-col overflow-x-clip">
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html:
              '<!-- DESIGN-CONTRACT: Apricot & Plum RME workspace. Use a bright warm surface system, a plum utility shell, table-first patient work, explicit clinical statuses, and one clear next action. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->',
          }}
        />
        <a
          href="#konten-utama"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
        >
          Lewati ke konten utama
        </a>
        <SidebarProvider>
          <Navbar />
          <main
            id="konten-utama"
            className="app-content flex-1"
            tabIndex={-1}
          >
            {children}
          </main>
        </SidebarProvider>
        <Toaster position="top-right" closeButton />
      </body>
    </html>
  );
}
