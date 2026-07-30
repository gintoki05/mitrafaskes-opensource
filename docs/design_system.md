# Design System Spesifikasi - Mitra Faskes Rekam Medis Elektronik (RME)

Design System **Mitra Faskes** dirancang dengan pendekatan *Clinical-Grade Design System* yang menggabungkan estetika modern, standar aksesibilitas WCAG, kerapatan informasi berakurasi tinggi (*High-Density Medical Interface*), dan performa antarmuka yang cepat.

---

## 🎨 1. Sistem Warna & Color Tokens

Sistem warna diatur untuk memberikan kenyamanan mata selama penggunaan jam kerja panjang (*shift* klinik), serta pemisahan visual yang jelas antar status medis:

### 🌟 Primary & Brand Accent (Medical Tech)
- **Teal Primary (`#14b8a6` / `teal-500`)**: Digunakan untuk aksi utama, kursor aktif, tab navigasi, dan tombol aksi `[Simpan RME]`.
- **Emerald Active (`#10b981` / `emerald-500`)**: Digunakan untuk indikator status **Terintegrasi SATUSEHAT Kemenkes**, status pemeriksaan selesai, dan vital signs normal.

### 🛡️ Neutral & Surface Tokens (Slate Dark Theme)
- **Background Root (`#020617` / `slate-950`)**: Latar belakang utama aplikasi yang ramah di mata dan hemat daya.
- **Card Surface (`#0f172a` / `slate-900`)**: Container untuk modul-modul RME (Anamnesis, Vital Signs, Resep).
- **Elevated Border (`#1e293b` / `slate-800`)**: Border halus pemisah antar elemen tanpa mengganggu fokus membaca.

### 🚦 Semantic Status Tokens (Traffic-Light Medical Alert)
- **Amber Warning (`#f59e0b` / `amber-500`)**: Indikator Pasien Menunggu Antrean (Triage) & status sinkronisasi pending.
- **Rose Critical (`#f43f5e` / `rose-500`)**: Indikator **Riwayat Alergi Obat**, Tensi/Vital Signs abnormal kritis, dan Gagal Sync SATUSEHAT.
- **Sky Info (`#0284c7` / `sky-500`)**: Catatan perawat dan informasi tambahan rekam medis.

---

## 🔤 2. Tipografi & Hierarki Teks

Menggunakan kombinasi font Sans-serif modern berkejelasan tinggi serta Monospace khusus untuk data medis numerik:

| Kategori | Font Family | Contoh Penggunaan |
| :--- | :--- | :--- |
| **Primary Sans** | `Inter`, `Geist Sans`, `sans-serif` | Nama Pasien, Anamnesis, Judul Modul, Label Form |
| **Medical Mono** | `JetBrains Mono`, `Geist Mono` | NIK KTP (16 digit), No. RM, Kode ICD-10 (`J00`), Tensi (`120/80`), Payload FHIR JSON |

### Skala Ukuran Teks:
- **Heading 1**: `text-xl` (20px / Bold) - Judul Halaman & Modul Utama
- **Heading 2**: `text-sm` (14px / Bold) - Judul Sub-modul (Anamnesis, Vital Signs, ICD-10)
- **Body Text**: `text-xs` (12px / Regular) - Isian Form, Catatan Dokter, Nama Obat
- **Caption / Badge**: `text-[10px]` - `text-[11px]` (SemiBold / Mono) - Status Badges & Stamp Waktu

---

## 📐 3. Spacing, Layout Density & Radius Tokens

Karena monitor PC di klinik/faskes bervariasi (mulai dari 1366x768 hingga 1080p), kerapatan informasi (*Layout Density*) dirancang agar **seluruh modul RME muat dalam 1 layar tanpa scrollbar liar**:

- **Card Border Radius**:
  - `rounded-xl` (12px) untuk Kartu Input & Modal Dialog.
  - `rounded-2xl` (16px) untuk Panel Modul Utama.
- **Padding Tokens**:
  - Compact: `p-3` (12px) untuk item daftar antrean & input field.
  - Standard: `p-6` (24px) untuk modul RME utama.
- **Grid Layout**:
  - 4 Column Desktop Layout: [Antrean Pasien (1 Col)] ➔ [Form RME Dokter (3 Col)].

---

## 🧩 4. Komponen UI Standar (shadcn/ui Based)

### 🔘 A. Button Variants
- **Primary Button**: `bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold` (Aksi Utama / Simpan RME).
- **Secondary Button**: `bg-slate-800 text-teal-400 border border-teal-500/20` (Cari, Refresh, Tambah Obat).
- **Danger Button**: `bg-rose-500/10 text-rose-400 border border-rose-500/30` (Hapus Item, Batal).

### 🏷️ B. Status Badge Components
- **Status Antrean Menunggu**: `<Badge variant="amber">MENUNGGU</Badge>`
- **Status Diproses Dokter**: `<Badge variant="teal">DIPERIKSA</Badge>`
- **Status SATUSEHAT Synced**: `<Badge variant="emerald">SATUSEHAT VERIFIED</Badge>`

### 🔍 C. Auto-complete Combobox (ICD-10 & KFA)
- Input kursor otomatis mengaktifkan dropdown melayang (*floating portal overlay*) dengan pembeda tegas antara **Kode ICD-10 (Teal Mono)** dan **Nama Penyakit Indonesia (White)**.
