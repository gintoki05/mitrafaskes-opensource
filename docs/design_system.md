# Design System — Mitra Faskes RME

Fondasi visual Mitra Faskes menggunakan cyan-teal dan ink navy dengan permukaan putih-kebiruan yang bersih untuk membaca data klinis dalam waktu lama. Struktur ini terinspirasi oleh referensi dashboard yang dipilih pengguna: sidebar persisten, topbar utilitas, judul halaman yang tegas, pencarian sebagai pintu masuk kerja, dan tabel sebagai permukaan utama.

Token diimplementasikan di `apps/web/app/globals.css` dan dipakai melalui utilitas semantik Tailwind.

## Warna

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `background` | `#F5FAFC` | Latar ruang kerja |
| `foreground` | `#16313A` | Teks utama dan ikon informasi |
| `card` | `#FFFFFF` | Tabel, dialog, dan panel |
| `border` / `input` | `#D7E5EA` / `#B7CBD3` | Batas permukaan dan kontrol |
| `primary` | `#0B7285` | Aksi utama, judul, dan highlight |
| `sidebar-background` | `#143B4A` | Sidebar dan topbar |
| `accent` | `#F2B84B` | Sorotan kecil dan penanda perhatian |
| `success` | `#2D826E` | Tersimpan, terhubung, selesai |
| `warning` | `#B0711F` | Menunggu atau perlu perhatian |
| `destructive` | `#B95656` | Gagal, hapus, dan akses ditolak |
| `info` | `#3F6F9A` | Proses dan informasi pendukung |

Status selalu membawa teks eksplisit dan, bila ruang memungkinkan, ikon: misalnya `TERHUBUNG`, `MENUNGGU`, dan `GAGAL`. Warna tidak menjadi satu-satunya pembeda.

## Struktur ruang kerja

- Sidebar desktop selebar 256px memuat identitas fasilitas, pencarian menu, navigasi utama, bantuan, dan keluar. Dengan trigger di topbar, sidebar dapat diciutkan menjadi rail ikon 72px; state disimpan lokal dan shortcut `Ctrl+B` / `Cmd+B` tersedia.
- Saat mode ikon aktif, label navigasi tetap tersedia untuk screen reader dan `title` membantu pengguna mengenali ikon; lebar topbar serta area kerja ikut menyesuaikan rail.
- Topbar desktop berada di atas area kerja dan memuat konteks fasilitas, status sistem, serta akun aktif.
- Pada layar kecil, navigasi menjadi bar horizontal yang dapat digeser; konten tetap memiliki ruang atas agar tidak tertutup topbar.
- Halaman operasional memakai `page-heading` dan `data-surface`; tabel/list menjadi pusat kerja, sedangkan kartu hanya dipakai untuk konteks atau dialog.
- Aksi primer harus jelas dan tunggal per konteks. Aksi sekunder memakai outline atau permukaan netral.

## Tipografi dan kerapatan

- Sans: stack sistem (`ui-sans-serif`, Segoe UI, dan fallback) untuk antarmuka dan isi rekam medis.
- Mono: stack sistem (`ui-monospace`, Consolas, dan fallback) untuk NIK, nomor rekam medis, kode ICD-10, vital sign, dan payload FHIR.
- `caption`: 12px; `body`: 14px; `heading`: 20–32px. Label klinis kecil tetap memakai bobot medium atau semibold agar mudah dipindai.
- Spacing token: 4, 8, 12, 16, 24, dan 32px (`--space-1` s.d. `--space-8`).
- Radius: kontrol 8px, kartu 10px, panel 12px. Jangan gunakan radius sebagai indikator status.

## State komponen

| State | Tombol | Input / pilihan | Indikator tambahan |
| --- | --- | --- | --- |
| Default | `primary` untuk aksi utama; `outline` atau `secondary` untuk aksi pendukung | Permukaan putih dengan border input | Label selalu terlihat |
| Hover | Primary lebih gelap; baris data memakai tint teal yang sangat ringan | Permukaan `muted` atau tint primary | Tidak mengubah posisi atau makna |
| Focus keyboard | Ring teal 3px dengan offset 2px | Ring dan border `ring` | Berlaku untuk tautan, tombol, input, textarea, select, dan row action |
| Disabled | `muted`, teks `muted-foreground`, cursor `not-allowed` | Sama; tidak bergantung pada opacity saja | Tombol tetap terbaca, tidak dapat dioperasikan |
| Error | `destructive` pada border/ring dan pesan | `aria-invalid` memakai border/ring destruktif | Pesan dinamis memakai `role="alert"` |
| Success | `success` pada badge/pesan | Tidak dipakai sebagai satu-satunya validasi field | Pesan simpan memakai `role="status"` |

Gunakan `Button`, `Input`, `Card`, dan `Badge` sebagai komponen dasar. Kelas `clinical-panel`, `clinical-card`, `clinical-field`, serta `clinical-status-success|warning|error` dipakai ketika elemen native atau struktur halaman memerlukan token yang sama.

## Aksesibilitas klinis

- Pertahankan kontras teks dan kontrol yang dapat dibaca pada permukaan white-blue, putih, dan ink navy.
- Jangan meniadakan `:focus-visible`; focus ring global adalah fallback untuk kontrol native dan elemen interaktif custom.
- Tabel harus memakai header kolom semantik, caption untuk pembaca layar, dan area scroll horizontal pada layar kecil.
- Pilihan antrean dan log sinkronisasi menyediakan status terpilih melalui `aria-pressed`; retry tetap dapat diakses keyboard tanpa membuat tombol bertumpuk.
- Jangan gunakan animasi sebagai satu-satunya penanda progres. Teks status harus tetap menjelaskan keadaan.

## Batas desain

- Jangan menambahkan gradient dekoratif, glassmorphism, shadow besar, atau kartu bertumpuk tanpa fungsi informasi.
- Jangan menyalin brand, logo, atau data contoh dari screenshot referensi.
- Pertahankan rute, izin, kontrak API, istilah Indonesia, dan perilaku klinis yang sudah ada ketika mengubah presentasi.
