# Spesifikasi Blueprint Penpot

File Penpot dipakai sebagai media eksplorasi dan handoff UI. Keputusan domain,
kamus data, dan acceptance criteria tetap berada di repository agar dapat
direview bersama code dan tidak bergantung pada satu tool desain.

Papan awal tersedia sebagai [SVG RME umum](./penpot/rme-rawat-jalan-blueprint.svg)
dan [ekstensi SVG gigi/akreditasi](./penpot/rme-gigi-akreditasi-extension.svg).

## Cara membuat file Penpot

1. Buat project `Mitra Faskes — Product Blueprint`.
2. Buat file `RME Rawat Jalan — v1`.
3. Import kedua SVG melalui menu import Penpot.
4. Pisahkan kelompok hasil import menjadi page/frame sesuai struktur di bawah.
5. Ubah pola yang berulang menjadi component; jangan mengubah teks domain tanpa
   memperbarui dokumen repository.

## Struktur page

| Page | Isi | Tujuan review |
| --- | --- | --- |
| `00 — Prinsip` | local-first, boundary RME/FHIR, role, istilah | Menyamakan keputusan produk |
| `01 — Journey` | happy path dan exception flows | Memastikan alur operasional utuh |
| `02 — Information Architecture` | navigasi, route, permission | Memastikan pengguna menemukan pekerjaan |
| `03 — Pendaftaran & Antrean` | patient search, visit form, queue states | Handoff registration flow |
| `04 — Workspace RME` | patient context, section navigation, form states | Handoff konsultasi utama |
| `04B — Konsultasi Gigi & Odontogram` | dental history, chart, tooth/surface editor, index, timeline | Handoff profil dokter gigi |
| `05 — Finalisasi` | preflight, confirmation, error, success | Handoff safety gate |
| `06 — Integrasi Opsional` | linkage, preview, dependency block, retry | Handoff state SATUSEHAT |
| `07 — Responsive & A11y` | keyboard, focus, narrow viewport, print | Acceptance non-happy-path |
| `08 — Akreditasi & Evidence` | standard version, gap, evidence, audit RME, owner | Handoff pusat bukti; bukan skor resmi |

## Frame utama

### A. Pendaftaran dan antrean

- pencarian pasien berdasarkan NIK/MRN/nama/tanggal lahir;
- hasil kandidat dengan data pembeda dan status linkage terpisah;
- form Encounter: tanggal, organisasi, lokasi/unit, dokter, alasan kunjungan;
- nomor antrean dibuat server;
- daftar pasien `WAITING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`;
- aksi padat menggunakan icon button ber-`aria-label` dan tooltip;
- tidak ada aksi langsung menyelesaikan Encounter klinis tanpa gate RME.

### B. Workspace RME dokter

Layout desktop tiga zona:

1. sidebar aplikasi;
2. patient/Encounter context yang sticky;
3. isi konsultasi dengan navigasi section dan panel form.

Urutan section:

`Ringkasan -> Anamnesis -> Alergi -> Tanda Vital -> Pemeriksaan -> Diagnosis -> Tindakan -> Resep -> Rencana & Edukasi -> Finalisasi`

State yang wajib didesain:

- loading pertama;
- tidak ada pasien aktif;
- draft baru kosong;
- draft tersimpan;
- autosave/simpan gagal;
- data terminologi sedang dimuat/gagal;
- field invalid per section;
- version conflict;
- read-only final;
- amendemen (fase lanjutan);
- integrasi nonaktif, belum linked, linked, latest sync failed.

### C. Finalisasi

- ringkasan section lengkap/tidak lengkap;
- error dikelompokkan per section dan dapat diklik untuk fokus ke field;
- identitas pasien dan Encounter selalu terlihat;
- CTA utama `Finalisasi RME`, sekunder `Kembali ke draft`;
- konfirmasi menjelaskan bahwa catatan menjadi read-only dan Encounter selesai;
- remote sync tidak menjadi syarat sukses finalisasi lokal.

### D. Monitor integrasi

- filter provider, environment, resource, status, dan waktu;
- local record, operation, attempt, outcome, pesan aman, dan next action;
- connected badge berasal dari linkage;
- aksi `Sinkronkan SATUSEHAT`/`Hubungkan SATUSEHAT` memakai shared action group;
- remote ID ditampilkan melalui badge/copy action, bukan text column panjang;
- dependency error menyebut resource lokal yang belum linked.

### E. Workspace konsultasi gigi

- header pasien/Encounter dan lifecycle sama dengan RME umum;
- switch dentisi permanen/sulung/campuran dan tanggal pembanding;
- dua baris odontogram dengan nomor FDI serta legenda teks/simbol;
- pemilihan satu atau beberapa gigi membuka side panel temuan dan surface;
- tab `Kunjungan ini`, `Sebelumnya`, dan `Perubahan` dengan provenance;
- card ekstraoral/intraoral, oral findings, DMF-T/dmf-t, OHI-S/DI-S/CI-S;
- diagnosis/tindakan menampilkan target gigi dan surface yang dapat ditelusuri;
- status `belum direview` tidak disamakan dengan `tanpa temuan`;
- mode daftar serta print menjadi fallback wajib untuk aksesibilitas dan mobile.

### F. Pusat bukti akreditasi

- facility type, standar, versi, tanggal efektif, dan tanggal pengecekan terlihat;
- filter bab TKK/PMKP/PKP, owner, status bukti, periode, dan kedaluwarsa;
- requirement drawer menunjukkan ringkasan kontrol, source resmi, evidence,
  reviewer, gap, dan rencana tindak lanjut;
- status memakai `SUPPORTED`, `PARTIAL`, `EXTERNAL_PROCESS`, atau
  `NOT_IMPLEMENTED`, bukan klaim lulus survei;
- audit RME, indikator mutu, insiden, risiko, dokumen, dan evidence pack adalah
  workflow berbeda dengan permission masing-masing;
- data klinis pada evidence harus minimum, dapat diredaksi, dan diaudit.

## Component set

Gunakan component names berikut agar handoff konsisten dengan code:

- `AppShell/Sidebar`, `AppShell/Topbar`;
- `PatientContext/Header`, `EncounterStatus/Badge`;
- `Queue/Row`, `Queue/StatusTabs`, `Queue/Action`;
- `ClinicalSection/Card`, `ClinicalSection/Status`;
- `Field/Select`, `Field/TerminologySearch`, `Field/QuantityUnit`;
- `Observation/VitalCard`, `Diagnosis/Row`, `MedicationOrder/Card`;
- `Dental/Odontogram`, `Dental/Tooth`, `Dental/SurfaceEditor`,
  `Dental/FindingTimeline`, `Dental/IndexCard`;
- `SaveState/Indicator`, `Validation/Summary`, `Conflict/Dialog`;
- `Satusehat/LinkageBadge`, `Satusehat/ActionGroup`, `Satusehat/DependencyAlert`.
- `Compliance/StandardVersion`, `Compliance/EvidenceStatus`,
  `Compliance/RequirementDrawer`, `Compliance/OwnerDueDate`.

## Design tokens

Gunakan incumbent tokens dari `apps/web/app/globals.css` dan
`docs/design_system.md`:

| Token | Nilai baseline | Penggunaan |
| --- | --- | --- |
| Primary | `#0B7285` | CTA, active item, focus emphasis |
| Background | `#F5FAFC` | Canvas aplikasi |
| Foreground | `#16313A` | Teks utama |
| Card | `#FFFFFF` | Panel/form |
| Border | `#D7E5EA` | Divider dan control outline |
| Sidebar | `#143B4A` | Navigasi utama |
| Accent | `#F2B84B` | Highlight terbatas |
| Success | `#2D826E` | Status sukses dengan text/icon |
| Warning | `#B0711F` | Peringatan dan incomplete |
| Destructive | `#B95656` | Error/destructive action |
| Info | `#3F6F9A` | Informasi |

Aturan visual:

- status tidak boleh dibedakan oleh warna saja;
- satu CTA utama per konteks;
- tanpa gradient dekoratif;
- label tetap terlihat pada form; placeholder bukan label;
- focus ring dan urutan keyboard harus dirancang;
- ukuran target interaksi minimum 40x40 px;
- clinical alert tidak boleh tertutup toast sementara saja.

## Responsive behavior

| Lebar | Perilaku |
| --- | --- |
| `>= 1280` | Sidebar penuh, context sticky, navigasi section + form berdampingan |
| `768–1279` | Sidebar ringkas; section navigation menjadi top tabs/dropdown |
| `< 768` | Satu kolom; patient context ringkas sticky; action bar bawah; tabel menjadi cards |

Finalisasi pada layar sempit tetap menampilkan identitas pasien, status draft,
jumlah error, dan CTA tanpa membuat pengguna kehilangan konteks.

## Handoff checklist

- setiap frame memiliki route/role/state annotation;
- field mengacu ke nama elemen pada kamus data;
- setiap aksi menyebut endpoint/command konseptual dan hasil sukses/gagal;
- loading, empty, error, disabled, permission, conflict, dan repeat-sync ada;
- copy UI tidak menyatakan data “sudah SATUSEHAT” hanya karena validasi lolos;
- layar akreditasi tidak menyebut “Paripurna” sebagai status software atau
  menghitung skor resmi dari jumlah attachment;
- designer dan engineer menautkan perubahan keputusan kembali ke dokumen repo.
