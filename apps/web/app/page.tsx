import { redirect } from 'next/navigation';

/**
 * Root Page - React Server Component (Server Page)
 * Dijalankan di Next.js App Server tanpa 'use client'
 */
export default async function Home() {
  // Server-side redirect otomatis di level Next.js App Server
  redirect('/login');
}
