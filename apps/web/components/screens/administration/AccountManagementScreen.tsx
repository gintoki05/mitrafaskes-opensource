'use client';

import { useMemo, useState } from 'react';
import { Activity, Clipboard, Eye, KeyRound, Pencil, Plus, ShieldCheck, UserCog, UserX } from 'lucide-react';
import type { AccountAuditItem, AccountMutationResponse, AccountSummary, WorkProfileType } from '@mitrafaskes/shared';
import { AccessPermission, WORK_PROFILE_LABELS } from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { RouteGuard } from '@/components/RouteGuard';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useSession } from '@/hooks/useSession';
import { can } from '@/lib/auth';
import { useAccounts, type AccountQuery } from '@/hooks/useAccounts';
import { useAccessRoles } from '@/hooks/useAccessRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FieldLabel } from '@/components/ui/field';
import { SelectField } from '@/components/screens/master-faskes/FormField';
import { AccountDialog } from './AccountDialog';
import { AccountFormDialog } from './AccountFormDialog';

export default function AccountManagementScreen() {
  const session = useSession();
  const user = session?.user ?? null;
  const canWrite = can(user, AccessPermission.ACCOUNT_WRITE);
  const canReset = can(user, AccessPermission.ACCOUNT_RESET_PASSWORD);
  const canAudit = can(user, AccessPermission.ACCESS_AUDIT_READ);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [active, setActive] = useState('');
  const [profile, setProfile] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AccountSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [credential, setCredential] = useState<{ password: string; expiresAt?: string } | null>(null);
  const [confirm, setConfirm] = useState<{ account: AccountSummary; action: 'deactivate' | 'activate' | 'reset' } | null>(null);
  const [auditAccount, setAuditAccount] = useState<AccountSummary | null>(null);
  const [audit, setAudit] = useState<AccountAuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const query = useMemo<AccountQuery>(() => ({ search: search || undefined, active: active === '' ? undefined : active === 'true', workProfileType: profile ? profile as WorkProfileType : undefined, page, pageSize: 25 }), [active, page, profile, search]);
  const accounts = useAccounts(query);
  const roles = useAccessRoles();

  const refreshAfterMutation = async () => { await accounts.refresh(); await roles.refresh(); };
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (account: AccountSummary) => { setEditing(account); setFormOpen(true); };
  const executeConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'reset') { const result = await accounts.resetPassword(confirm.account.id); if ('temporaryPassword' in result && result.temporaryPassword) setCredential({ password: result.temporaryPassword, expiresAt: result.temporaryPasswordExpiresAt }); toast.success('Password sementara dibuat.'); }
      else await accounts.setActive(confirm.account.id, confirm.action === 'activate');
      setConfirm(null); await accounts.refresh();
    } catch (error) { toast.error('Aksi akun gagal.', { description: error instanceof Error ? error.message : 'Silakan coba lagi.' }); }
  };
  const openAudit = async (account: AccountSummary) => {
    setAuditAccount(account);
    if (!canAudit) return;
    setAuditLoading(true);
    try { setAudit(await accounts.getAudit(account.id)); }
    catch (error) { toast.error('Audit akun tidak dapat dimuat.', { description: error instanceof Error ? error.message : undefined }); }
    finally { setAuditLoading(false); }
  };
  const copyCredential = async () => { if (!credential) return; await navigator.clipboard.writeText(credential.password); toast.success('Password sementara disalin.'); };

  return <RouteGuard permission={AccessPermission.ACCOUNT_READ}><div className="page-shell space-y-5"><PageHeader icon={<UserCog className="h-5 w-5" />} title="Akun pengguna" description="Atur akun, role akses, profil kerja, status, dan password sementara dari satu tempat." action={canWrite ? <Button onClick={openCreate}><Plus className="h-4 w-4" />Tambah akun</Button> : undefined} />
    <div className="grid gap-3 sm:grid-cols-3"><SummaryCard label="Total akun" value={accounts.meta.total} icon={<UserCog className="h-4 w-4" />} /><SummaryCard label="Aktif" value={accounts.statusCounts.active} icon={<Activity className="h-4 w-4" />} tone="success" /><SummaryCard label="Nonaktif" value={accounts.statusCounts.inactive} icon={<UserX className="h-4 w-4" />} tone="muted" /></div>
    <Card><CardHeader className="border-b border-border"><CardTitle className="text-base">Direktori akun</CardTitle><div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]"><div><FieldLabel htmlFor="account-search">Cari akun</FieldLabel><Input id="account-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); setSearch(searchDraft.trim()); } }} placeholder="Nama, username, atau NIK" /></div><div><FieldLabel htmlFor="account-status-filter">Status</FieldLabel><SelectField id="account-status-filter" value={active} onChange={(value) => { setPage(1); setActive(value); }}><option value="">Semua status</option><option value="true">Aktif</option><option value="false">Nonaktif</option></SelectField></div><div><FieldLabel htmlFor="account-profile-filter">Profil kerja</FieldLabel><SelectField id="account-profile-filter" value={profile} onChange={(value) => { setPage(1); setProfile(value); }}><option value="">Semua profil</option><option value="NON_CLINICAL">Non-klinis</option><option value="DOKTER">Dokter</option><option value="PERAWAT">Perawat</option></SelectField></div><div className="flex items-end"><Button variant="outline" onClick={() => { setSearchDraft(''); setSearch(''); setActive(''); setProfile(''); setPage(1); }}>Reset</Button></div></div></CardHeader><CardContent className="p-0">{accounts.loading ? <ScreenState kind="loading" title="Memuat akun" compact className="m-4" /> : accounts.error ? <ScreenState kind="error" title="Akun tidak dapat dimuat" description={accounts.error} compact className="m-4" action={<Button variant="outline" onClick={() => void accounts.refresh()}>Coba lagi</Button>} /> : accounts.items.length === 0 ? <ScreenState kind="empty" title="Belum ada akun yang cocok" description="Ubah filter atau buat akun baru." compact className="m-4" /> : <Table><TableHeader><TableRow><TableHead>Pengguna</TableHead><TableHead>Role akses</TableHead><TableHead>Profil kerja</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{accounts.items.map((account) => <TableRow key={account.id}><TableCell><div className="font-semibold text-foreground">{account.fullName}</div><div className="text-xs text-muted-foreground">@{account.username}</div></TableCell><TableCell><Badge variant="outline">{account.accessRole.name}</Badge></TableCell><TableCell>{WORK_PROFILE_LABELS[account.workProfileType]}</TableCell><TableCell><Badge variant={account.active ? 'default' : 'secondary'}>{account.active ? 'Aktif' : 'Nonaktif'}</Badge>{account.mustChangePassword ? <span className="ml-2 text-[11px] text-warning">Wajib ganti password</span> : null}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Lihat akun ${account.fullName}`} title="Lihat detail" onClick={() => openAudit(account)}><Eye className="h-4 w-4" /></Button>{canWrite ? <Button variant="ghost" size="icon-sm" aria-label={`Edit akun ${account.fullName}`} title="Edit akun" onClick={() => openEdit(account)}><Pencil className="h-4 w-4" /></Button> : null}{canReset ? <Button variant="ghost" size="icon-sm" aria-label={`Reset password ${account.fullName}`} title="Reset password" onClick={() => setConfirm({ account, action: 'reset' })}><KeyRound className="h-4 w-4" /></Button> : null}{canWrite ? <Button variant="ghost" size="icon-sm" aria-label={`${account.active ? 'Nonaktifkan' : 'Aktifkan'} akun ${account.fullName}`} title={account.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => setConfirm({ account, action: account.active ? 'deactivate' : 'activate' })}><ShieldCheck className="h-4 w-4" /></Button> : null}</div></TableCell></TableRow>)}</TableBody></Table>}{accounts.meta.total > 25 ? <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground"><span>Halaman {accounts.meta.page} · {accounts.meta.total} akun</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Sebelumnya</Button><Button size="sm" variant="outline" disabled={page * 25 >= accounts.meta.total} onClick={() => setPage((current) => current + 1)}>Berikutnya</Button></div></div> : null}</CardContent></Card>
    {!roles.loading && roles.error ? <ScreenState kind="error" title="Role tidak dapat dimuat" description="Daftar akun tetap dapat dibaca, tetapi pembuatan/edit akun memerlukan akses role." compact /> : null}
    <AccountFormDialog key={`${editing?.id ?? 'new'}-${formOpen}`} open={formOpen} account={editing} roles={roles.roles} onClose={() => setFormOpen(false)} onCreate={async (input) => { const result = await accounts.create(input); await refreshAfterMutation(); return result as AccountMutationResponse; }} onUpdate={async (id, input) => { const result = await accounts.update(id, input); await refreshAfterMutation(); return result; }} onCredential={(next) => setCredential(next)} />
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.action === 'reset' ? 'Reset password akun?' : `${confirm?.action === 'deactivate' ? 'Nonaktifkan' : 'Aktifkan'} akun?`} description={confirm ? `${confirm.account.fullName} (@${confirm.account.username})` : ''} confirmLabel={confirm?.action === 'reset' ? 'Buat password sementara' : confirm?.action === 'deactivate' ? 'Nonaktifkan' : 'Aktifkan'} destructive={confirm?.action === 'deactivate'} onClose={() => setConfirm(null)} onConfirm={() => void executeConfirm()} />
    <CredentialDialog credential={credential} onClose={() => setCredential(null)} onCopy={() => void copyCredential()} />
    <AuditDialog account={auditAccount} items={audit} loading={auditLoading} onClose={() => setAuditAccount(null)} canAudit={canAudit} />
  </div></RouteGuard>;
}

function SummaryCard({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: React.ReactNode; tone?: 'default' | 'success' | 'muted' }) { return <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-primary">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone === 'success' ? 'bg-success/15 text-success' : tone === 'muted' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>{icon}</span></CardContent></Card>; }

function ConfirmDialog({ open, title, description, confirmLabel, destructive, onClose, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; onClose: () => void; onConfirm: () => void }) { return <AccountDialog open={open} title={title} onClose={onClose} className="max-w-md"><Card><CardHeader><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{description}</p></CardHeader><CardContent><p className="text-sm">Tindakan ini akan dicatat pada audit akses dan dapat mencabut sesi pengguna.</p></CardContent><div className="flex justify-end gap-2 border-t border-border p-4"><Button variant="outline" onClick={onClose}>Batal</Button><Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button></div></Card></AccountDialog>; }

function CredentialDialog({ credential, onClose, onCopy }: { credential: { password: string; expiresAt?: string } | null; onClose: () => void; onCopy: () => void }) { return <AccountDialog open={Boolean(credential)} title="Password sementara" onClose={onClose} className="max-w-md"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-primary"><KeyRound className="h-5 w-5" />Password sementara</CardTitle><p className="text-sm text-muted-foreground">Salin sekarang. Password ini tidak akan ditampilkan lagi.</p></CardHeader><CardContent><div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-muted p-3"><code className="flex-1 break-all text-sm font-bold tracking-wide">{credential?.password}</code><Button size="icon-sm" variant="outline" aria-label="Salin password sementara" title="Salin" onClick={onCopy}><Clipboard className="h-4 w-4" /></Button></div>{credential?.expiresAt ? <p className="mt-3 text-xs text-warning">Berlaku sampai {new Date(credential.expiresAt).toLocaleString('id-ID')}.</p> : null}</CardContent><div className="flex justify-end border-t border-border p-4"><Button onClick={onClose}>Selesai</Button></div></Card></AccountDialog>; }

function AuditDialog({ account, items, loading, onClose, canAudit }: { account: AccountSummary | null; items: AccountAuditItem[]; loading: boolean; onClose: () => void; canAudit: boolean }) { return <AccountDialog open={Boolean(account)} title="Detail akun" onClose={onClose} className="max-w-2xl"><Card><CardHeader className="border-b border-border"><CardTitle>{account?.fullName}</CardTitle><p className="text-sm text-muted-foreground">@{account?.username} · {account?.accessRole.name}</p></CardHeader><CardContent className="space-y-4 pt-5"><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Profil kerja</p><p className="font-semibold">{account ? WORK_PROFILE_LABELS[account.workProfileType] : '-'}</p></div><div><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold">{account?.active ? 'Aktif' : 'Nonaktif'}</p></div><div><p className="text-xs text-muted-foreground">Dibuat</p><p className="font-semibold">{account ? new Date(account.createdAt).toLocaleDateString('id-ID') : '-'}</p></div></div>{canAudit ? <div><h2 className="mb-2 text-sm font-semibold">Aktivitas terbaru</h2>{loading ? <ScreenState kind="loading" title="Memuat audit" compact /> : items.length === 0 ? <ScreenState kind="empty" title="Belum ada aktivitas" compact /> : <div className="space-y-2">{items.map((item) => <div key={item.id} className="rounded-[var(--radius-control)] border border-border p-3"><p className="text-sm font-medium">{item.summary}</p><p className="mt-1 text-xs text-muted-foreground">{item.actor ? `${item.actor.fullName} · ` : ''}{new Date(item.createdAt).toLocaleString('id-ID')}</p></div>)}</div>}</div> : <p className="text-xs text-muted-foreground">Riwayat perubahan tersedia untuk role dengan permission audit akses.</p>}</CardContent><div className="flex justify-end border-t border-border p-4"><Button onClick={onClose}>Tutup</Button></div></Card></AccountDialog>; }
