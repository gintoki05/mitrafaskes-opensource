'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, clearSession, defaultRoute, setSession } from '@/lib/auth';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/field';

export default function ChangeRequiredPasswordScreen() {
  const router = useRouter();
  const session = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (session === null) router.replace('/login'); else if (session && !session.user.mustChangePassword) router.replace(defaultRoute(session.user)); }, [router, session]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (newPassword.length < 8) { toast.error('Password baru minimal 8 karakter.'); return; } if (newPassword !== confirmation) { toast.error('Konfirmasi password belum sama.'); return; } setSaving(true); try { const response = await apiFetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) }); if (!response.ok) { const payload = await response.json().catch(() => ({})) as { message?: string }; throw new Error(payload.message || 'Password belum dapat diubah.'); } const payload = await response.json() as { user?: Parameters<typeof setSession>[0] }; if (payload.user) setSession(payload.user); toast.success('Password berhasil diperbarui.'); router.replace(payload.user ? defaultRoute(payload.user) : '/'); } catch (error) { toast.error('Password belum diperbarui.', { description: error instanceof Error ? error.message : 'Silakan coba lagi.' }); } finally { setSaving(false); } };
  const logout = () => { void apiFetch('/api/auth/logout', { method: 'POST' }).finally(() => { clearSession(); router.replace('/login'); }); };
  return <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-xl items-center justify-center px-4 py-8"><Card className="w-full"><CardHeader><CardTitle className="flex items-center gap-2 text-primary"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><KeyRound className="h-5 w-5" /></span>Ganti password sementara</CardTitle><p className="text-sm leading-relaxed text-muted-foreground">Untuk keamanan, password sementara harus diganti sebelum Anda dapat membuka ruang kerja klinik.</p></CardHeader><form onSubmit={submit}><CardContent className="space-y-4"><div><FieldLabel htmlFor="current-password" required>Password sementara saat ini</FieldLabel><Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={saving} /></div><div><FieldLabel htmlFor="new-password" required>Password baru</FieldLabel><Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={saving} minLength={8} /><p className="mt-1 text-xs text-muted-foreground">Minimal 8 karakter.</p></div><div><FieldLabel htmlFor="password-confirmation" required>Ulangi password baru</FieldLabel><Input id="password-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={saving} /></div><div className="rounded-[var(--radius-control)] border border-info/25 bg-info/10 p-3 text-xs text-info"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Sesi lain akun ini akan dicabut setelah password berubah.</div></CardContent><CardFooter className="justify-between gap-2"><Button type="button" variant="ghost" onClick={logout} disabled={saving}><LogOut className="h-4 w-4" />Keluar</Button><Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan password baru'}</Button></CardFooter></form></Card></div>;
}
