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
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
