---
target: dashboard pendaftaran RME Mitra Faskes
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-02T16-27-00Z
slug: apps-web-components-screens-pendaftaranscreen-tsx
---
# Kritik desain dashboard Mitra Faskes — target apps/web/components/screens/PendaftaranScreen.tsx

## Design Health Score

| # | Heuristik | Skor | Temuan kunci |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Loading, success, error, dan status antrean tersedia; state pending per aksi antrean dan status koneksi SATUSEHAT belum dapat dipercaya. |
| 2 | Match Between System and Real World | 3/4 | NIK, No. RM, antrean, poli, dan SATUSEHAT sesuai domain; “Actions”, “Filter aktif”, dan dokter hardcoded mengurangi kecocokan operasional. |
| 3 | User Control and Freedom | 2/4 | Dialog punya Batal dan Escape; belum ada undo/cancel antrean, retry yang jelas, focus trap, atau focus return. |
| 4 | Consistency and Standards | 3/4 | Primitive UI, semantic table, focus ring, dan token status cukup konsisten; istilah dan dialog custom masih menyimpang. |
| 5 | Error Prevention | 1/4 | Required dan maxLength membantu, tetapi tanggal lahir default terisi dan submit antrean dapat diklik berulang. |
| 6 | Recognition Rather Than Recall | 3/4 | Tiga kunci pencarian disebut langsung dan data penting terlihat di baris pasien. |
| 7 | Flexibility and Efficiency of Use | 2/4 | Search ada, tetapi harus submit manual; belum ada shortcut pendaftaran, bulk action, atau alur cepat yang aman. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Table-first cukup tenang dan padat; dua surface besar, enam kolom, count badge, dan alert global menambah beban scan. |
| 9 | Error Recognition and Recovery | 2/4 | Pesan state sudah terbaca dan live region tersedia; belum ada retry, error per baris/field, atau detail recovery. |
| 10 | Help and Documentation | 2/4 | Deskripsi halaman dan placeholder membantu; belum ada bantuan kontekstual untuk poli, dokter, aturan antrean, atau status sinkronisasi. |
| **Total** |  | **23/40** | **Acceptable — perlu perbaikan signifikan sebelum pengalaman terasa aman dan matang.** |

## Design Specificity Verdict

Hasilnya cukup spesifik untuk Mitra Faskes, tetapi belum sepenuhnya signature. Apricot–plum, sidebar persisten, pencarian sebagai pintu masuk kerja, tabel pasien, typography mono untuk NIK/No. RM, dan status teks eksplisit membentuk grammar operasional yang jelas. Namun pola card/table/button masih dapat dipertukarkan dengan dashboard admin generik; produk belum cukup menonjolkan konteks poli, dokter penanggung jawab, nomor antrean berikutnya, atau status sync pasien.

Deterministic scan Impeccable pada target utama menghasilkan 0 temuan, tanpa rule atau lokasi file yang dilaporkan. Ini berarti detector tidak menemukan pola mekanis yang dikenali sebagai masalah; hasil bersih tersebut tidak memverifikasi idempotensi request, ketepatan data klinis, status SATUSEHAT, focus management, atau keterbacaan runtime.

Browser automation dan overlay tidak tersedia pada sesi ini, sehingga tidak ada overlay [Human] yang dapat dilihat. Review visual pixel-level, kontras aktual, keyboard traversal runtime, dan screen-reader behavior masih perlu diuji di browser.

## Overall Impression

Dashboard ini sudah memiliki fondasi visual yang tenang dan masuk akal untuk meja depan: cari pasien, lihat identitas, masukkan ke antrean. Masalah terbesar bukan “kurang cantik”, melainkan bahwa beberapa keputusan berisiko dibuat terlalu mudah dan hasilnya belum menutup loop dengan cukup meyakinkan. Kesempatan terbesar adalah mengubah aksi utama menjadi aman dan kontekstual: satu aksi hanya boleh menghasilkan satu antrean, dengan poli/dokter/status yang jelas, feedback per baris, dan nomor antrean yang langsung dikonfirmasi.

## What's Working

- Arsitektur table-first sesuai pekerjaan admin/petugas pendaftaran. PatientDirectory memakai caption, scope pada header, horizontal scrolling, serta state loading/empty/error.
- UI sudah permission-aware. Pasien baru dan Masuk antrean hanya muncul sesuai capability, sehingga shell dapat dipakai oleh petugas pendaftaran dan Admin tanpa menampilkan semua aksi ke Dokter.
- Visual language cukup konsisten: permukaan apricot/bone untuk kerja data, plum untuk shell, mono untuk identifier klinis, dan status memakai teks eksplisit alih-alih warna saja.

## Priority Issues

### [P1] Masuk antrean terlalu cepat dan tidak aman

Referensi: apps/web/components/screens/pendaftaran/PatientDirectory.tsx:106 dan apps/web/components/screens/PendaftaranScreen.tsx:73.

Tombol Masuk antrean tidak memiliki loading state per pasien, disabled state, atau guard terhadap encounter aktif. Double-click pada meja depan dapat membuat antrean ganda. Aksi juga mengirim doctorId 'doc-001' tanpa menampilkan atau meminta konteks poli/dokter; ini membuat ownership antrean tidak terlihat bagi petugas pendaftaran, Admin, maupun Dokter yang menerima handoff.

Fix: simpan queueingPatientId, nonaktifkan hanya baris yang sedang diproses, ubah label menjadi Memproses…, cegah enqueue jika pasien sudah memiliki encounter aktif, dan tampilkan nama pasien + nomor antrean baru + poli/dokter pada success state. Jika konteks memang harus dipilih, jadikan poli/dokter bagian dari keputusan sebelum submit.

Suggested command: $impeccable harden untuk state pending, duplicate prevention, dan recovery; lalu $impeccable polish.

### [P1] Tanggal lahir pasien baru terisi data contoh

Referensi: apps/web/components/screens/PendaftaranScreen.tsx:24 dan apps/web/components/screens/pendaftaran/PatientRegistrationDialog.tsx:75.

Form dimulai dengan 1992-05-10. Admin dapat melewatkan koreksi dan menyimpan identitas klinis yang salah karena field terlihat valid sejak awal.

Fix: default ke string kosong, validasi tanggal di field, pertahankan input ketika server menolak, dan tampilkan error dekat field terkait—terutama konflik NIK—bukan hanya error global.

Suggested command: $impeccable harden.

### [P1] Status antrean tidak dikenal dianggap selesai

Referensi: apps/web/components/screens/pendaftaran/QueuePanel.tsx:45 dan apps/web/lib/clinical-types.ts:12.

Conditional rendering hanya membedakan WAITING dan IN_PROGRESS; status lain jatuh ke label SELESAI. CANCELLED atau status baru dapat terlihat sebagai selesai, sehingga status operasional/klinis salah terbaca.

Fix: buat exhaustive status map. Tampilkan DIBATALKAN untuk status cancel, label khusus untuk status lain, dan fallback STATUS TIDAK DIKENAL. Jangan menjadikan unknown sebagai sukses atau selesai.

Suggested command: $impeccable clarify untuk nomenklatur/status; lalu $impeccable harden.

### [P1] Status SATUSEHAT memberi reassurance yang belum terbukti

Referensi: apps/web/components/Navbar.tsx:195, apps/web/components/screens/pendaftaran/PatientRegistrationDialog.tsx:59, dan apps/web/components/screens/PendaftaranScreen.tsx:53.

Topbar selalu menampilkan Terhubung SATUSEHAT, sementara alur buat pasien tidak memperlihatkan status sinkronisasi dari endpoint koneksi atau sync log. Admin dan petugas pendaftaran dapat menyimpulkan pasien sudah tersinkron padahal yang berhasil baru penyimpanan lokal/API pasien.

Fix: baca status koneksi secara real-time dan bedakan Terhubung, Belum dikonfigurasi, Pending, dan Gagal. Setelah pasien disimpan, tampilkan status sync pasien secara eksplisit beserta retry jika memang retryable.

Suggested command: $impeccable clarify untuk copy/status; lalu $impeccable harden.

### [P2] Modal registrasi belum memiliki focus management lengkap

Referensi: apps/web/components/screens/pendaftaran/PatientRegistrationDialog.tsx:43 dan :90.

role=dialog, aria-modal, labelling, dan autoFocus sudah ada, tetapi belum terlihat focus trap, pengembalian fokus ke tombol pembuka, atau kaitan error field dengan aria-describedby/aria-invalid. Pengguna keyboard atau screen reader dapat keluar dari konteks modal saat mengisi data.

Fix: gunakan primitive dialog yang mengelola focus, atau implementasikan trap + return focus secara eksplisit. Tambahkan error per field dengan hubungan ARIA yang jelas dan pastikan target tombol kecil tetap nyaman.

Suggested command: $impeccable audit.

Tidak ada P0 yang dapat dibuktikan dari source review ini.

## Cognitive Load Assessment

| Checklist | Status | Evidence |
|---|---|---|
| Single focus | Sebagian gagal | Search adalah entry point utama, tetapi Antrean dan Pasien Baru tampil bersamaan sebagai dua aksi header. |
| Chunking | Lulus | Directory dan antrean dipisah menjadi dua surface; form pasien disembunyikan sampai diperlukan. |
| Grouping | Lulus | Toolbar, tabel, queue, dan dialog dikelompokkan dengan border/surface yang konsisten. |
| Visual hierarchy | Sebagian gagal | Judul, dua tombol header, count pasien, count antrean, dan alert global bersaing dalam satu viewport. |
| One thing at a time | Lulus sebagian | Setiap baris hanya memiliki satu aksi, tetapi keputusan poli/dokter tidak terlihat sebelum enqueue. |
| Minimal choices | Lulus dengan catatan | Dua aksi header dan satu aksi per baris masih terkendali; enam kolom tabel menaikkan beban scan. |
| Working memory | Lulus | Placeholder dan deskripsi mengulang tiga kunci pencarian: NIK, No. RM, nama. |
| Progressive disclosure | Lulus | Form pasien baru berada dalam dialog; status detail dapat dikembangkan jika dibuat kontekstual. |

Ada sekitar dua kegagalan parsial, jadi cognitive load berada di tingkat moderat: bukan overload, tetapi hirarki dan ownership aksi perlu dipertegas.

## Emotional Journey / Peak-End

- Entry terasa meyakinkan: search berada di atas tabel dan menjelaskan cara menemukan pasien.
- Selection cukup percaya diri karena nama, gender, No. RM, NIK, dan status SATUSEHAT terlihat dalam satu baris. Namun tidak ada selected-row state atau ringkasan sebelum aksi.
- Action terasa cepat, tetapi anxiety tinggi karena klik tidak menunjukkan sedang diproses dan dapat diulang.
- Peak belum menutup loop: success message hanya “Tindakan berhasil” / “Pasien berhasil ditambahkan ke antrean”, tanpa nama, nomor antrean, poli, atau dokter.
- End bergantung pada refresh async QueuePanel. Jika refresh gagal, pengguna mendapat error global tanpa retry yang langsung.

Versi percaya diri dari alur ini harus membuat pengguna bisa menjawab dalam satu detik: pasien siapa, antrean nomor berapa, untuk poli/dokter mana, status sync apa, dan apa yang bisa dilakukan jika gagal.

## Persona Red Flags

### Alex — power user

- Search masih membutuhkan submit manual dari form di PatientDirectory; belum ada shortcut fokus atau jalur keyboard khusus untuk pendaftaran.
- Tidak ada feedback per baris saat antrean sedang diproses, sehingga Alex tidak tahu apakah klik sudah diterima.
- Tidak ada batch action atau guard yang membuat operasi berulang aman.
- Tabel minimum 850px dapat mendorong action column jauh di luar viewport mobile/responsive.

### Sam — accessibility-dependent user

- Modal belum menjamin focus trap dan focus return.
- Error form belum dikaitkan ke field tertentu; pengguna screen reader tidak mendapat konteks yang sama dengan pengguna visual.
- Button size sm sekitar 32px dan teks status 11–12px perlu verifikasi target sentuh dan kontras aktual.
- Positifnya, lang id, skip link, semantic table, caption, visible labels, focus ring global, dan live region untuk loading/success sudah tersedia.

### Petugas pendaftaran / Admin front desk

- Double-click pada Masuk antrean berisiko membuat antrean ganda.
- Tanggal lahir default dapat lolos sebagai data valid yang salah.
- Success message tidak menyebut nomor antrean dan owner klinis; petugas masih harus mencari ulang di panel.
- Label Filter aktif sebenarnya hanya menghitung hasil pasien, sehingga dapat menyesatkan saat mencari data.
- Full NIK ditampilkan di tabel; perlu keputusan apakah seluruh digit memang dibutuhkan atau sebaiknya dimasking sampai row dipilih.

### Dokter sebagai penerima handoff

- QueuePanel belum menampilkan poli/dokter dan status unknown dapat tampil sebagai SELESAI.
- Shell sudah memberi shortcut di alur RME dokter, tetapi handoff dari pendaftaran ke pemeriksaan belum memiliki bukti status yang sama kuatnya.

## Minor Observations

- Ganti header Actions menjadi Aksi agar istilah konsisten dengan UI berbahasa Indonesia.
- Ubah Filter aktif menjadi Hasil pencarian atau tampilkan filter yang benar.
- Antrean “hari ini” sebaiknya menampilkan tanggal, last refreshed, poli, dan dokter/owner.
- “Bantuan sistem” di sidebar saat ini tampak seperti teks dekoratif, bukan affordance bantuan.
- Full NIK adalah informasi sensitif; pertimbangkan masking parsial atau reveal-on-select.
- Detector bersih tidak berarti design system bebas masalah; scan mekanis memang tidak menilai data semantics dan workflow state.

## Questions to Consider

- Siapa yang memiliki antrean: petugas pendaftaran, poli, atau dokter? Jawaban ini menentukan apakah poli/dokter harus dipilih sebelum enqueue.
- Apakah topbar boleh menyatakan Terhubung SATUSEHAT tanpa status runtime per facility dan per patient?
- Apa definisi selesai yang benar, dan bagaimana CANCELLED/PENDING/UNKNOWN harus terlihat bagi tiap role?
