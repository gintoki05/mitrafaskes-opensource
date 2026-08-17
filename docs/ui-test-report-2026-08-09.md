# Laporan Uji UI Master Faskes sampai Pendaftaran Pasien

Tanggal: 2026-08-09 WIB
Browser: Chrome extension, aplikasi lokal `http://localhost:3000`
Akun: Siti Rahma (Admin)
Data uji: hanya data sintetis dengan prefix `UI-E2E-20260809`; data produksi/identitas pasien nyata tidak digunakan.

## Catatan baseline sebelum eksekusi

Catatan ini dibuat setelah inspeksi read-only pada menu dan sebelum membuat, mengubah, menonaktifkan, atau mengirim record baru.

| Menu | Kondisi awal teramati | Risiko/masalah yang harus divalidasi |
|---|---|---|
| Organisasi / Faskes | 8 record lokal; seluruh record yang tampil berstatus aktif dan sudah terhubung SATUSEHAT; tombol tambah, edit, nonaktifkan, sinkron, dan hubungkan tersedia. Semua baris menampilkan `Alamat belum diisi`. | Pastikan CRUD lokal tidak otomatis dianggap sinkron; sinkron baru memakai create, sinkron ulang memakai update; perubahan lokal dan status linkage tetap konsisten. Validasi apakah alamat wajib/opsional dan apakah pesan `Alamat belum diisi` menghambat sinkronisasi. |
| Location / Ruangan | 5 record lokal; seluruh record yang tampil aktif dan terhubung SATUSEHAT; seluruhnya bertipe lokasi spesifik/ruangan. | Pastikan organisasi induk tervalidasi sebelum create/sync, CRUD lokal tetap dapat dilakukan, dan repeat-sync memperbarui resource yang sama. Validasi apakah form multi-langkah, filter organisasi, serta status SATUSEHAT konsisten. |
| Practitioner / Nakes | 5 record lokal; 2 record belum terhubung dan tombol sinkronnya disabled; 2 record terhubung; sebagian besar record tidak memiliki Organization/Location, SIP, atau STR. | Dependency dan kelengkapan NIK harus memblokir sync secara spesifik tanpa false connected status. Validasi CRUD, aktivasi/nonaktifkan bila tersedia, serta update terhadap practitioner yang telah terhubung. |
| Pendaftaran & Antrean / Pasien | 5 pasien lokal; 2 terhubung SATUSEHAT, 3 belum tersinkron. Antrean berisi 2 pasien. | Baseline sudah menunjukkan kegagalan sync: `Patient.address[0].extension` tidak ditemukan pada beberapa record dan `district or village didn't match with City code` pada satu record. Validasi form pasien baru, edit, detail, masuk antrean, sync create, dan repeat-sync/update. |

## Urutan dan pembagian eksekusi

1. Organisasi / Faskes: buat record sintetis, edit, sinkron create, edit ulang, sinkron update, verifikasi linkage dan log.
2. Location / Ruangan: gunakan organisasi induk yang sudah terhubung, lalu ulangi skenario create/edit/sync/update.
3. Practitioner / Nakes: gunakan dependency yang sudah tersedia; uji jalur berhasil dan jalur blokir karena data tidak lengkap.
4. Pendaftaran pasien: buat pasien sintetis, edit, sinkron create, edit ulang, sinkron update, masuk antrean, dan cek status/list.

Setiap area diuji pada tab Chrome terpisah oleh agent yang berbeda bila memungkinkan. Record sintetis akan dinonaktifkan atau dihapus hanya bila UI menyediakan jalur aman dan tidak menghilangkan bukti sinkronisasi; jika tidak, ID record dicatat untuk cleanup manual.

## Temuan eksekusi

| Area | Status | Bukti/masalah |
|---|---|---|
| Organisasi / Faskes | PASS | Create dan repeat-sync/update berhasil. Record `UI-E2E-ORG-20260809-RERUN-01` memperoleh external ID `549b1117-8ccf-4fff-81d0-6b2046d83686`; ID tetap sama setelah edit, update, dan refresh. Record uji dinonaktifkan melalui UI. Monitoring hanya menampilkan log Encounter, bukan log Organization. |
| Location / Ruangan | PASS | Create dan repeat-sync/update berhasil untuk `UI-E2E-LOC-20260809-01`; external ID `e65531ad-3aaa-4f8a-90f5-416728aace86` tetap sama. Ditemukan pesan validasi organisasi yang tertinggal sesaat dan dialog preview yang tidak menutup/menyegarkan status otomatis setelah sync sukses. |
| Practitioner / Nakes | PARTIAL | CRUD lokal berhasil, tetapi record sintetis `UI-E2E-PRAC-20260809 Practitioner` tidak memiliki kandidat di Master Nakes Index. Tidak ada remote create/update atau false linkage. Tombol sync aktif setelah NIK diisi walau Organization/Location/SIP/STR kosong dan tetap aktif saat status nonaktif. |
| Pendaftaran & Antrean / Pasien | PARTIAL | Create/edit/detail/search dan masuk antrean berhasil; `UI-E2E-PAT-20260809 Prima` terhubung sebagai `P20396170528`. Repeat-sync terdeteksi sebagai update tetapi gagal pada `'replace' operation on '/active' is not supported`; linkage sukses terakhir tetap dipertahankan dan error terbaru terlihat. Antrean bertambah dari 2 menjadi 3. |

### Organisasi / Faskes

- Validasi CRUD lokal dan refresh berhasil.
- Preview pertama menunjukkan `Operasi: Buat data baru`; sinkronisasi berhasil.
- Edit lokal berikutnya menunjukkan `Operasi: Perbarui data`; sinkronisasi berhasil dan external ID tidak berubah.
- Record hasil rerun berakhir `NONAKTIF` tetapi tetap `Terhubung`, sesuai perilaku linkage last-known.
- Record sintetis lama `UI-E2E-ORG-20260809-CODE` yang muncul saat agent mulai tidak diubah.
- Halaman Monitoring SATUSEHAT tetap menampilkan `2 Log Total`, semuanya Encounter; log Organization dari create/update tidak tampak di UI.

### Location / Ruangan

- Dependency organisasi diuji: tanpa organisasi muncul `Organisasi induk wajib dipilih.` dan lokasi induk disabled.
- Form tiga langkah, validasi kode/nama, create, edit, refresh, sync create, dan sync update berhasil.
- Preview update menampilkan `Operasi: Perbarui data`; external ID `e65531ad-3aaa-4f8a-90f5-416728aace86` tetap sama.
- List akhir menampilkan data lokal `NONAKTIF` dan status Location operasional `Aktif`; dua label status ini berpotensi membingungkan pengguna dan perlu dipastikan memang sengaja berbeda.

### Practitioner / Nakes

- Saat create tanpa NIK, tombol sync disabled; setelah NIK diisi tombol menjadi aktif walau Organization/Location/SIP/STR masih kosong.
- Dialog lookup menampilkan `Belum ada kandidat Practitioner`, `Practitioner SATUSEHAT tidak ditemukan`, dan tombol hubungkan disabled.
- Sync tidak sampai remote create/update sehingga update terhadap external ID tidak dapat dibuktikan.
- Record sintetis dibiarkan `NONAKTIF` dan `Belum tersinkron` karena UI tidak menyediakan penghapusan aman.

### Pendaftaran & Antrean / Pasien

- Validasi form kosong menampilkan `Nama lengkap minimal 2 karakter.` dan `Tanggal lahir wajib diisi.`
- Percobaan sync awal pasien sintetis gagal dengan `Incomplete request. Requires identifier, name, gender, birthDate`; setelah NIK dilengkapi, retry create berhasil dan external ID `P20396170528` bertahan setelah refresh.
- Preview repeat-sync mengonfirmasi update, tetapi remote menolak patch `/active` dengan `'replace' operation on '/active' is not supported`.
- UI memperlihatkan status `Terhubung` sekaligus pesan kegagalan terakhir; ini benar sebagai last-known linkage, tetapi perlu dipastikan copy/statusnya cukup jelas.
- Masalah baseline pasien lama tetap ada: `Patient.address[0].extension` dan `district or village didn't match with City code (Rule Number: 10621)`.
- Pasien sintetis tambahan `UI-E2E-PAT-20260809-RETRY Alpha` muncul dari agent pengganti yang sempat berjalan; record tetap `Belum tersinkron` dengan error request incomplete dan tidak diubah lagi. UI tidak menyediakan delete/cleanup aman.

## Ringkasan keputusan sync

| Resource | Create | Repeat-sync/update | External ID tetap | Kesimpulan |
|---|---|---|---|---|
| Organization | Berhasil | Berhasil | Ya | Update SATUSEHAT bekerja. |
| Location | Berhasil | Berhasil | Ya | Update SATUSEHAT bekerja. |
| Practitioner | Tidak terjadi; lookup tidak menemukan kandidat | Tidak dapat diuji | Tidak ada | Jalur link/lookup gagal secara aman, tetapi dependency UI kurang tegas. |
| Patient | Gagal pada data belum lengkap, lalu berhasil setelah NIK dilengkapi | Terdeteksi update tetapi gagal pada patch `/active` | Ya; linkage lama dipertahankan | Create bekerja setelah data lengkap; update Patient belum kompatibel dengan operasi remote yang didukung. |

## Observabilitas dan cleanup

- Verifikasi read-only pada tab baru menunjukkan record sintetis dan status linkage bertahan setelah refresh.
- Console browser pada verifikasi akhir tidak memiliki error/warning.
- UI Monitoring SATUSEHAT hanya menampilkan 2 log Encounter; log Organization, Location, dan Patient yang diuji tidak terlihat. Ini harus ditindaklanjuti sebelum monitoring dianggap sebagai sumber bukti lengkap.
- Tidak ada perubahan repository selain file laporan ini.
- Record sintetis organisasi/location/practitioner/pasien tidak dihapus karena UI tidak menyediakan jalur delete yang aman; organization/location/practitioner diuji dengan status nonaktif bila tersedia. External linkage yang sudah berhasil dipertahankan sebagai bukti audit.

## Verifikasi SATUSEHAT

Untuk setiap record yang berhasil dikirim, catat: ID lokal, operasi pertama (`create`), operasi sinkron ulang (`update`), external ID yang tetap, status UI setelah refresh, dan pesan/error terakhir. Kegagalan baru tidak boleh menciptakan linkage palsu; linkage sukses sebelumnya boleh dipertahankan sebagai last-known dan harus disertai error terbaru.
