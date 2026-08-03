'use client';

import type { FormEventHandler } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PatientRegistrationDialogProps = {
  open: boolean;
  nik: string;
  fullName: string;
  birthDate: string;
  gender: string;
  address: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onNikChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onAddressChange: (value: string) => void;
};

export function PatientRegistrationDialog({
  open,
  nik,
  fullName,
  birthDate,
  gender,
  address,
  onClose,
  onSubmit,
  onNikChange,
  onFullNameChange,
  onBirthDateChange,
  onGenderChange,
  onAddressChange,
}: PatientRegistrationDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-title"
      aria-describedby="registration-description"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <Card className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto shadow-xl">
        <CardHeader className="border-b border-border">
          <CardTitle id="registration-title" className="flex items-center gap-2 text-base font-bold text-foreground">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            Daftarkan pasien baru
          </CardTitle>
          <p id="registration-description" className="text-xs leading-relaxed text-muted-foreground">
            Data identitas ini digunakan untuk membuat nomor rekam medis dan mengirim pendaftaran ke alur SATUSEHAT.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="registration-nik" className="mb-1.5 block text-xs font-semibold text-foreground">NIK (16 digit sesuai KTP)</label>
              <Input id="registration-nik" type="text" maxLength={16} inputMode="numeric" value={nik} onChange={(event) => onNikChange(event.target.value)} placeholder="Contoh: 3171012304900001" className="font-mono text-sm" autoFocus required />
            </div>
            <div>
              <label htmlFor="registration-name" className="mb-1.5 block text-xs font-semibold text-foreground">Nama lengkap pasien</label>
              <Input id="registration-name" type="text" value={fullName} onChange={(event) => onFullNameChange(event.target.value)} placeholder="Nama sesuai KTP" className="text-sm" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="registration-birth-date" className="mb-1.5 block text-xs font-semibold text-foreground">Tanggal lahir</label>
                <Input id="registration-birth-date" type="date" value={birthDate} onChange={(event) => onBirthDateChange(event.target.value)} className="text-sm" required />
              </div>
              <div>
                <label htmlFor="registration-gender" className="mb-1.5 block text-xs font-semibold text-foreground">Jenis kelamin</label>
                <Select
                  value={gender || null}
                  onValueChange={(value) => onGenderChange(value ?? '')}
                >
                  <SelectTrigger
                    id="registration-gender"
                    className="clinical-field min-h-9 w-full px-3 py-2 text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Laki-laki</SelectItem>
                    <SelectItem value="FEMALE">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="registration-address" className="mb-1.5 block text-xs font-semibold text-foreground">Alamat tempat tinggal</label>
              <Input id="registration-address" type="text" value={address} onChange={(event) => onAddressChange(event.target.value)} placeholder="Jl. Melati No. 12" className="text-sm" />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
              <Button type="submit"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Simpan pasien</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
