'use client';

import { useMemo, useState } from 'react';
import { KeyRound, Save, UserPlus, X } from 'lucide-react';
import type { AccessRoleDetail, AccountMutationResponse, AccountSummary, WorkProfileType } from '@mitrafaskes/shared';
import { WorkProfileType as WorkProfile } from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/field';
import { SelectField } from '@/components/screens/master-faskes/FormField';
import { AccountDialog } from './AccountDialog';

type FormState = { username: string; fullName: string; accessRoleId: string; workProfileType: WorkProfileType; nik: string; birthDate: string; gender: string; sipNumber: string; strNumber: string };
const emptyForm: FormState = { username: '', fullName: '', accessRoleId: '', workProfileType: WorkProfile.NON_CLINICAL, nik: '', birthDate: '', gender: '', sipNumber: '', strNumber: '' };

export function AccountFormDialog({ open, account, roles, onClose, onCreate, onUpdate, onCredential }: { open: boolean; account: AccountSummary | null; roles: AccessRoleDetail[]; onClose: () => void; onCreate: (input: unknown) => Promise<AccountMutationResponse>; onUpdate: (id: string, input: unknown) => Promise<unknown>; onCredential: (credential: { password: string; expiresAt?: string }) => void }) {
  const [form, setForm] = useState<FormState>(() => account ? { username: account.username, fullName: account.fullName, accessRoleId: account.accessRole.id, workProfileType: account.workProfileType, nik: account.nik ?? '', birthDate: account.birthDate ?? '', gender: account.gender ?? '', sipNumber: account.sipNumber ?? '', strNumber: account.strNumber ?? '' } : { ...emptyForm, accessRoleId: roles[0]?.id ?? '' });
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(account);
  const selectedRole = useMemo(() => roles.find((role) => role.id === form.accessRoleId), [form.accessRoleId, roles]);
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.accessRoleId || (!isEditing && !form.username.trim())) { toast.error('Lengkapi data akun terlebih dahulu.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, nik: form.nik || null, birthDate: form.birthDate || null, gender: form.gender || null, sipNumber: form.sipNumber || null, strNumber: form.strNumber || null };
      if (account) { await onUpdate(account.id, payload); toast.success('Akun berhasil diperbarui.'); }
      else { const result = await onCreate(payload); toast.success('Akun berhasil dibuat.'); if (result.temporaryPassword) onCredential({ password: result.temporaryPassword, expiresAt: result.temporaryPasswordExpiresAt }); }
      onClose();
    } catch (error) { toast.error('Perubahan akun gagal.', { description: error instanceof Error ? error.message : 'Silakan coba lagi.' }); }
    finally { setSaving(false); }
  };
  return (
    <AccountDialog open={open} title={isEditing ? 'Edit akun' : 'Tambah akun'} onClose={() => { if (!saving) onClose(); }}>
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-primary"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><UserPlus className="h-4 w-4" /></span>{isEditing ? 'Edit akun pengguna' : 'Tambah akun pengguna'}</CardTitle><p className="mt-2 text-xs text-muted-foreground">Role mengatur akses aplikasi. Jenis profil kerja menjaga aturan domain klinis tetap konsisten.</p></div><Button type="button" variant="ghost" size="icon" aria-label="Tutup dialog" title="Tutup" onClick={onClose}><X className="h-4 w-4" /></Button></div>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><FieldLabel htmlFor="account-full-name" required>Nama lengkap</FieldLabel><Input id="account-full-name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} disabled={saving} autoComplete="name" /></div>
              <div><FieldLabel htmlFor="account-username" required={!isEditing}>Username</FieldLabel><Input id="account-username" value={form.username} onChange={(event) => update('username', event.target.value)} disabled={saving || isEditing} autoComplete="username" placeholder="contoh: admin_klinik" /></div>
              <div><FieldLabel htmlFor="account-role" required>Role akses</FieldLabel><SelectField id="account-role" value={form.accessRoleId} onChange={(value) => update('accessRoleId', value)} disabled={saving || roles.length === 0}>{roles.filter((role) => role.active).map((role) => <option key={role.id} value={role.id}>{role.name}{role.system === 'SUPER_ADMIN' ? ' · semua akses' : ''}</option>)}</SelectField>{selectedRole ? <p className="mt-1 text-xs text-muted-foreground">{selectedRole.description || `${selectedRole.permissions.length} permission aktif.`}</p> : null}</div>
              <div><FieldLabel htmlFor="account-work-profile" required>Jenis profil kerja</FieldLabel><SelectField id="account-work-profile" value={form.workProfileType} onChange={(value) => update('workProfileType', value as WorkProfileType)} disabled={saving}><option value={WorkProfile.NON_CLINICAL}>Non-klinis</option><option value={WorkProfile.DOKTER}>Dokter</option><option value={WorkProfile.PERAWAT}>Perawat</option></SelectField></div>
            </div>
            <section className="rounded-[var(--radius-control)] border border-border bg-muted/25 p-4"><div className="mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-semibold">Profil klinis opsional</h2><p className="text-xs text-muted-foreground">Diisi untuk identitas Practitioner dan kebutuhan integrasi.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel htmlFor="account-nik">NIK</FieldLabel><Input id="account-nik" inputMode="numeric" maxLength={16} value={form.nik} onChange={(event) => update('nik', event.target.value)} disabled={saving} /></div><div><FieldLabel htmlFor="account-birth-date">Tanggal lahir</FieldLabel><Input id="account-birth-date" type="date" value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} disabled={saving} /></div><div><FieldLabel htmlFor="account-gender">Jenis kelamin</FieldLabel><SelectField id="account-gender" value={form.gender} onChange={(value) => update('gender', value)} disabled={saving}><option value="">Belum diisi</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></SelectField></div><div><FieldLabel htmlFor="account-sip">Nomor SIP</FieldLabel><Input id="account-sip" value={form.sipNumber} onChange={(event) => update('sipNumber', event.target.value)} disabled={saving} /></div><div><FieldLabel htmlFor="account-str">Nomor STR</FieldLabel><Input id="account-str" value={form.strNumber} onChange={(event) => update('strNumber', event.target.value)} disabled={saving} /></div></div></section>
            {!isEditing ? <p className="rounded-[var(--radius-control)] border border-info/25 bg-info/10 p-3 text-xs text-info">Password sementara akan dibuat sistem, hanya ditampilkan sekali, berlaku 24 jam, dan wajib diganti saat login pertama.</p> : null}
          </CardContent>
          <CardFooter className="justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button><Button type="submit" disabled={saving || roles.length === 0}><Save className="h-4 w-4" />{saving ? 'Menyimpan…' : isEditing ? 'Simpan perubahan' : 'Buat akun'}</Button></CardFooter>
        </form>
      </Card>
    </AccountDialog>
  );
}
