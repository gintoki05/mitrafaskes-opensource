# Matriks Peran dan Izin Alur Klinik Inti

Dokumen ini mencatat keputusan produk untuk PRI-8. Kontrak yang dapat
dikonsumsi frontend dan backend berada di
`packages/shared/src/access-control.ts`; tabel di bawah menjelaskan alasan dan
perilaku yang harus diterapkan oleh PRI-10.

## Peran fase awal

| Peran produk | Nilai role saat ini | Halaman awal | Tanggung jawab |
| --- | --- | --- | --- |
| Petugas pendaftaran | `PETUGAS_PENDAFTARAN` | `/pendaftaran` | Identitas pasien, pendaftaran, dan antrean masuk |
| Perawat klinis | `PERAWAT` | `/triase` | Triase awal, vital, dan penyelesaian triase saat Encounter `WAITING`; dapat melanjutkan triase yang tertinggal saat `IN_PROGRESS` |
| Dokter | `DOKTER` | `/rme` | Memulai pemeriksaan, mengisi draft, dan finalisasi RME |
| Admin | `ADMIN` | `/master-faskes` | Operasi master faskes dan pengawasan integrasi bila diaktifkan |

`PERAWAT` digunakan untuk perawat klinis. Akun pendaftaran menggunakan role
terpisah `PETUGAS_PENDAFTARAN`; akun `PERAWAT` yang sudah ada dipertahankan dan
berubah mengikuti matriks triase klinis.

## Matriks kemampuan

`V` berarti boleh melihat/membaca, `U` berarti boleh mengubah/menjalankan, dan
`—` berarti ditolak.

| Area dan tindakan | Petugas pendaftaran | Perawat klinis | Dokter | Admin |
| --- | :---: | :---: | :---: | :---: |
| Login | U | U | U | U |
| Lihat identitas pasien | V | V | V | V |
| Buat/ubah identitas pasien | U | — | — | U |
| Lihat antrean | V | V | V | V |
| Tambah pasien ke antrean | U | — | — | U |
| Batalkan antrean | U | — | — | U |
| Mulai pemeriksaan | — | — | U | — |
| Lihat isi RME | — | — | V | — |
| Simpan/selesaikan triase | — | U | — | — |
| Buat/ubah draft RME | — | — | U | — |
| Finalisasi RME dan encounter | — | — | U | — |
| Lihat status sinkronisasi | V | — | — | V |
| Retry item retryable | U | — | — | U |
| Lihat payload sinkronisasi mentah | — | — | — | V |

Admin bukan peran klinis. Admin dapat membantu operasi pendaftaran pada
instalasi kecil dan menangani sinkronisasi, tetapi tidak boleh membaca atau
menulis isi RME. Petugas pendaftaran boleh melihat status sinkronisasi yang
telah disederhanakan dan melakukan retry yang dinyatakan aman, tetapi payload
mentah tetap khusus Admin. Perawat hanya mengerjakan triase; dokter tetap satu-
satunya aktor yang dapat memulai konsultasi dan memfinalisasi RME.

## Pemetaan permission

| Tindakan | Permission bersama |
| --- | --- |
| Login | `auth.login` |
| Lihat pasien | `patient.read` |
| Buat/ubah pasien | `patient.write` |
| Lihat antrean | `queue.read` |
| Tambah antrean | `queue.create` |
| Batalkan antrean | `queue.cancel` |
| Mulai pemeriksaan | `queue.start` |
| Lihat RME | `rme.read` |
| Simpan draft RME | `rme.write-draft` |
| Finalisasi RME | `rme.finalize` |
| Lihat triase | `rme.triage-read` |
| Simpan draft triase | `rme.triage-write` |
| Selesaikan triase | `rme.triage-complete` |
| Lihat status sinkronisasi | `sync.status-read` |
| Retry sinkronisasi | `sync.retry` |
| Lihat payload mentah | `sync.payload-read` |

## Perilaku tanpa izin

API adalah sumber kebenaran. Penyembunyian tombol di frontend tidak pernah
menggantikan pemeriksaan izin di server.

| Kondisi | Respons API | Perilaku frontend |
| --- | --- | --- |
| Tidak ada sesi pada capability terlindungi | `401 UNAUTHENTICATED` | Hapus sesi lokal dan arahkan ke `/login` tanpa loop |
| Sesi sah tetapi role tidak memiliki capability | `403 FORBIDDEN` | Tampilkan halaman akses ditolak; jangan mengulang request |
| Aksi tidak tersedia untuk role | Tetap `403` jika endpoint dipanggil langsung | Sembunyikan aksi yang tidak relevan; nonaktifkan hanya bila pengguna perlu melihat alasan |
| Sesi sah membuka `/login` | Tidak perlu memanggil login | Arahkan ke halaman awal role |
| Role atau payload sesi tidak dikenal | Perlakukan sebagai sesi tidak sah (`401`) | Hapus sesi dan kembali ke `/login` |

## Batas implementasi

PRI-8 hanya menetapkan kontrak keputusan. Endpoint API saat ini belum memakai
guard dan navigasi frontend masih membaca `localStorage` secara langsung.
Penerapan sesi, route guard, pemeriksaan permission, serta pengujian akses sah
dan tidak sah adalah scope PRI-10.
