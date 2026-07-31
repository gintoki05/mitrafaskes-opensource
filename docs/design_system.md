# Design System — Mitra Faskes RME

Fondasi visual Mitra Faskes menggunakan permukaan terang-netral untuk mendukung pembacaan data klinis dalam waktu lama, dengan hijau klinis sebagai aksen tindakan utama. Token diimplementasikan di `apps/web/app/globals.css` dan dipakai melalui utilitas semantik Tailwind.

## Warna

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `background` | `#F8FAFC` | Latar aplikasi |
| `foreground` | `#0F172A` | Teks utama dan ikon informasi |
| `card` | `#FFFFFF` | Kartu, dialog, dan panel |
| `border` / `input` | `#D9E0E9` | Batas permukaan dan kontrol |
| `primary` | `#1F7A4F` | Aksi utama, tautan aktif, fokus |
| `secondary` | hijau lembut | Aksi sekunder dan pilihan netral |
| `muted` | netral terang | Latar item pasif dan hover |
| `success` | `#1F7A4F` | Keberhasilan tersimpan/tersinkron |
| `warning` | `#AB6A0B` | Menunggu atau perlu perhatian |
| `destructive` | `#B42525` | Gagal, hapus, dan akses ditolak |
| `info` | `#146B97` | Informasi pendukung |

Status selalu membawa teks eksplisit dan, bila ruang memungkinkan, ikon: misalnya `SUKSES` dengan centang, `PENDING` dengan jam, dan `GAGAL` dengan peringatan. Warna tidak menjadi satu-satunya pembeda.

## Tipografi dan kerapatan

- Sans: stack sistem (`ui-sans-serif`, Segoe UI, dan fallback) untuk antarmuka dan isi rekam medis; tidak membutuhkan unduhan font saat build.
- Mono: stack sistem (`ui-monospace`, Consolas, dan fallback) untuk NIK, nomor rekam medis, kode ICD-10, vital sign, dan payload FHIR.
- `caption`: 12px; `body`: 14px; `heading`: 20px. Label klinis kecil tetap memakai bobot medium atau semibold agar mudah dipindai.
- Spacing token: 4, 8, 12, 16, 24, dan 32px (`--space-1` s.d. `--space-8`). Gunakan layout rapat namun beri jarak minimal 12px antar kontrol yang berbeda.
- Radius: kontrol 8px, kartu 12px, panel 16px. Jangan gunakan radius sebagai indikator status.

## State komponen

| State | Tombol | Input / pilihan | Indikator tambahan |
| --- | --- | --- | --- |
| Default | `primary` untuk aksi utama; `secondary` atau outline untuk aksi pendukung | Permukaan `background`, border `input` | Label selalu terlihat |
| Hover | Primary lebih gelap; permukaan sekunder menjadi `accent` atau `muted` | `muted` pada daftar/pilihan | Tidak mengubah posisi atau makna |
| Focus keyboard | Ring hijau 3px dengan offset 2px | Ring dan border `ring` | Berlaku untuk tautan, tombol, input, textarea, select, dan elemen keyboard custom |
| Disabled | `muted`, teks `muted-foreground`, cursor `not-allowed` | Sama; tidak bergantung pada opacity saja | Tombol tetap terbaca, tidak dapat dioperasikan |
| Error | `destructive` pada border/ring dan pesan | `aria-invalid` memakai border/ring destruktif | Pesan kesalahan `role="alert"` bila muncul dinamis |
| Success | `success` pada badge/pesan | Tidak dipakai sebagai satu-satunya validasi field | Pesan simpan memakai `role="status"` dan teks eksplisit |

Gunakan `Button`, `Input`, `Card`, dan `Badge` sebagai komponen dasar. Kelas `clinical-panel`, `clinical-card`, `clinical-field`, serta `clinical-status-success|warning|error` dipakai ketika elemen native atau struktur halaman memerlukan token yang sama.

## Aksesibilitas klinis

- Pertahankan kontras teks dan kontrol yang dapat dibaca pada permukaan putih/netral.
- Jangan meniadakan `:focus-visible`; focus ring global adalah fallback untuk kontrol native dan elemen interaktif custom.
- Pilihan antrean dan log sinkronisasi menyediakan status terpilih melalui `aria-pressed`; log yang memiliki aksi retry tetap dapat diakses keyboard tanpa membuat tombol bertumpuk.
- Jangan gunakan animasi sebagai satu-satunya penanda progres. Teks status harus tetap menjelaskan keadaan.

## Batas desain saat ini

Dokumen ini menetapkan token dan state PRI-9. Struktur application shell dan navigasi menyeluruh adalah ruang kerja PRI-11; desain detail alur pendaftaran atau RME tidak diubah oleh fondasi token ini.
