# Panduan Psikologi UI/UX & Ergonomi Rekam Medis Elektronik (RME) Mitra Faskes

Dokumen ini memuat analisis mendalam mengenai **Psikologi Pengguna (User Psychology)**, **Hukum UX Medis (EHR UX Laws)**, serta **Strategi Desain Antarmuka Ergonomis** untuk aplikasi Rekam Medis Elektronik (RME) Indonesia yang dirancang khusus bagi Dokter Praktik Mandiri, Perawat, dan Admin Pendaftaran di Klinik Pratama & FKTP.

---

## 🧠 1. Analisis Psikologi Pengguna (User Persona & Psychology)

### 👨‍⚕️ A. Dokter (Pemeriksa RME)
* **Kondisi Mental**: 
  - *Cognitive Fatigue*: Kelelahan mental akibat menatap layar monitor komputer seharian setelah memeriksa puluhan pasien.
  - *High Time Constraint*: Waktu ideal pemeriksaan pasien sangat singkat (rata-rata 3–7 menit per pasien).
* **Frustrasi Utama**: 
  - Harus memindahkan tangan antara **Keyboard** dan **Mouse** secara berulang kali (*context switching*).
  - Harus mengetik ulang kalimat anamnesis atau nama obat yang sama puluhan kali sehari.
  - Mencari kode diagnosis ICD-10 secara manual atau harus menghafal kode angka ICD-10.
* **Kebutuhan UX Utama**:
  1. **Speed & Minimal Clicks**: Input harus berorientasi pada **Keyboard-Centric Navigation** (`Tab`, `Enter`, `Shortcut`).
  2. **Smart Autocomplete & Template**: Pencarian ICD-10 dalam Bahasa Indonesia & Inggris serta *Preset Template Resep Paket Obat* (contoh: 1-klik paket "Flu/ISPA").
  3. **Visual Clarity**: Informasi riwayat alergi obat dan vital signs kritis harus terlihat dalam *1 detik pertama* tanpa perlu mengaktifkan scrollbar.

---

### 👩‍⚕️ B. Perawat (Triage & Vital Signs)
* **Kondisi Mental**: *High Throughput & Interruption-Prone* (sering diinterupsi oleh pasien yang bertanya di ruang tunggu atau panggilan darurat).
* **Frustrasi Utama**: 
  - Kehilangan draf isian vital signs saat berpindah layar atau saat aplikasi tidak sengaja ter-refresh.
  - Bingung menentukan pasien mana yang sudah ditimbang/diukur tensinya dan mana yang masih menunggu.
* **Kebutuhan UX Utama**:
  1. **Fast Data Entry Grid**: Form input Tensimeter (Sistolik/Diastolik), Nadi, Suhu, BB/TB yang dapat diisi secara berurutan hanya dengan menekan tombol `Tab`.
  2. **Clear Queue Indicator**: Visual warna badge status antrean yang tegas (Menunggu Triage 🟡 ➔ Siap Diperiksa Dokter 🟢).

---

### 👩‍💼 C. Admin Pendaftaran Pasien
* **Kondisi Mental**: *High Stress Front-Desk* (menghadapi antrean fisik pasien secara langsung di meja depan).
* **Kebutuhan UX Utama**:
  1. **Instant Search NIK / No. RM**: Pencarian pasien dalam waktu `< 1 detik`.
  2. **SATUSEHAT Verification Badge**: Indikator langsung apakah NIK pasien sudah valid dan terhubung ke SATUSEHAT Kemenkes RI.

---

## 📐 2. Penerapan Hukum Psikologi UX Medis (EHR UX Laws)

### 1. **Miller’s Law (Information Chunking)**
> *Otak manusia hanya dapat memproses 5–7 kelompok informasi dalam satu waktu.*
* **Penerapan RME**: Form RME Dokter dipecah menjadi **4 Blok Visual Terisolasi**:
  1. 🟦 **Blok 1**: Kartu Profil Pasien & Riwayat Alergi (Terselip di bagian atas).
  2. 🟨 **Blok 2**: Anamnesis & Vital Signs (Sisi Kiri).
  3. 🟥 **Blok 3**: Search Auto-complete ICD-10 Diagnosis (Sisi Tengah/Kanan).
  4. 🟩 **Blok 4**: E-Resep & Aturan Pakai Obat (Sisi Bawah).

---

### 2. **Fitts’s Law (Target Size & Placement)**
> *Waktu untuk menjangkau suatu tombol berbanding lurus dengan jarak dan ukuran tombol tersebut.*
* **Penerapan RME**: Tombol aksi utama seperti **`[Simpan & Kirim SATUSEHAT]`** dibuat dengan ukuran besar, kontras tinggi (Gradien Teal/Emerald), dan ditempatkan di posisi alami pergerakan mata (Kanan Bawah).

---

### 3. **Hick’s Law (Minimal Choice Overload)**
> *Semakin banyak pilihan yang diberikan, semakin lama waktu keputusan yang diambil.*
* **Penerapan RME**: Pada saat Dokter mengetik diagnosis, sistem tidak menampilkan ribuan baris ICD-10, melainkan hanya menampilkan **5 rekomendasi penyakit teratas yang paling sering ditangani di klinik tersebut**.

---

### 4. **Recognition over Recall**
> *Pengguna lebih mudah mengenali pilihan yang ada daripada mengingat kode dari memori.*
* **Penerapan RME**: Dokter tidak perlu mengingat kode `J00`. Cukup mengetik `"batuk"` atau `"flu"`, sistem otomatis mengenali dan menampilkan `J00 - Acute nasopharyngitis [common cold]`.

---

### 5. **Feedback & Traffic-Light Status System**
> *Pengguna membutuhkan kepastian instan atas status tindakan yang telah dilakukan.*
* **Penerapan RME**: Indikator Visual Sinkronisasi SATUSEHAT Kemenkes RI:
  - 🟢 **Hijau (SUKSES)**: Terkirim & Terverifikasi Kemenkes (Lengkap dengan ID Resource).
  - 🟡 **Kuning (PENDING)**: Dalam Antrean Queue Sync.
  - 🔴 **Merah (GAGAL)**: Gagal (Lengkap dengan tombol 1-Klik `Retry` tanpa perlu mengulang input RME).

---

## ⚡ 3. Fitur UX Cepat & Ergonomis (Keyboard-Centric Workflow)

| Shortcut | Fungsi UX | Manfaat Medis |
| :--- | :--- | :--- |
| **`Ctrl + Enter`** | Simpan RME & Kirim SATUSEHAT | Dokter tidak perlu menggeser mouse ke tombol simpan |
| **`Alt + D`** | Fokus Kursor ke Input ICD-10 | Langsung mengetik diagnosis tanpa klik kursor |
| **`Alt + R`** | Fokus Kursor ke Input Resep Obat | Langsung menambah e-resep obat |
| **`Tab` / `Shift + Tab`** | Navigasi Sekuensial Vital Signs | Mengisi tensi, nadi, suhu secara berurutan |

---

## 🎨 4. Palet Warna & Kontras Ergonomis (Prevent Eye Strain)

Palet aktif mengikuti `docs/design_system.md`: permukaan **terang-netral** untuk keterbacaan data klinis jangka panjang, tanpa menyediakan dark mode pada fase fondasi saat ini.

- **Background utama (`#F8FAFC`) dan kartu putih (`#FFFFFF`)**: Memisahkan struktur halaman secara tenang dengan teks utama slate gelap (`#0F172A`) agar kontras konsisten.
- **Hijau klinis (`#1F7A4F`)**: Aksen tindakan utama, fokus keyboard, serta status aman/sukses.
- **Amber (`#AB6A0B`)**: Menandakan status menunggu atau kondisi yang memerlukan perhatian.
- **Merah (`#B42525`)**: Menandakan alergi, kegagalan, tindakan destruktif, atau akses ditolak.
- **Biru informasi (`#146B97`)**: Menandakan informasi pendukung yang bukan aksi utama.

Warna tidak boleh menjadi satu-satunya pembeda. Setiap status tetap memakai label teks eksplisit dan, bila ruang memungkinkan, ikon yang sesuai.
