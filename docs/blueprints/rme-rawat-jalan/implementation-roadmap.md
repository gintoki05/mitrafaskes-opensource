# Roadmap Implementasi

Roadmap memakai issue Linear yang sudah ada. Tidak perlu membuat rangkaian issue
baru hanya untuk menyalin blueprint; detail desain ini menjadi acceptance source
bagi issue terkait.

## Urutan delivery

| Fase | Hasil | Issue Linear | Exit gate |
| --- | --- | --- | --- |
| 0. Blueprint | Journey, model domain, kamus data, mapping, wireframe | PRI-5, PRI-25 | Review produk + klinis awal |
| 1. RME lifecycle foundation | `DRAFT`/`FINAL`, versioning, ownership, migration | PRI-17 | Draft tersimpan tanpa menutup Encounter; final immutable |
| 2. Workspace konsultasi | Persistent patient context, section UX, state lengkap | PRI-18, PRI-19 | Empty/loading/error/conflict dan data kosong aman |
| 2a. Triase klinis | Role `PERAWAT` klinis, `PETUGAS_PENDAFTARAN`, triage draft/complete, audit koreksi, dan gate antrean | Scope saat ini | Perawat dapat mengisi triase pada `WAITING` atau melanjutkan triase tertinggal pada `IN_PROGRESS`; dokter dapat mulai dengan warning |
| 3. Finalisasi aman | Preflight, transaction, audit, idempotency | PRI-20, PRI-21 | RME final + Encounter complete atomik |
| 4. Encounter remote | Create/update, linkage/log, UI, repeat sync | PRI-23, PRI-24 | **API/plugin dan UI tersedia; sandbox create + update ID sama masih perlu diverifikasi** |
| 5. Condition | Model diagnosis/complaint + terminology + adapter | PRI-19, PRI-23, PRI-29 | **Adapter, dependency preflight, linkage/log, dan UI sync tersedia; sandbox perlu diverifikasi** |
| 6. Observation | Observation typed + LOINC/UCUM + adapter | PRI-19, PRI-23, PRI-29 | **Adapter, dependency preflight, linkage/log, dan sync per item tersedia; sandbox perlu diverifikasi** |
| 7. Profil konsultasi gigi | DentalExam, odontogram, index, timeline, validation profile | Belum dipetakan | Dental journey lokal dan histori lolos review dokter gigi |
| 8. Clinical extensions | Allergy, Procedure, MedicationRequest, Plan, dental imaging | PRI-19, PRI-23 | Resource hanya dibuat bila data berlaku |
| 9. Summary & reliability | Encounter finished, Composition, monitor/retry | PRI-23, PRI-24 | Urutan final dapat direkonsiliasi |
| 10. Kontrol RME digital | Amendment, access audit, disclosure, retention, audit mutu RME | Belum dipetakan | Kontrol Permenkes 24 diuji dan bukti dapat ditelusuri |
| 11. Evidence akreditasi | Standard registry, evidence, indikator, risiko/insiden, evidence pack | Belum dipetakan | Self-assessment internal tanpa klaim skor resmi |
| 12. End-to-end assurance | Full local, dental, governance, dan sandbox journeys | PRI-22, PRI-30 + scope baru | Skenario manual + automated critical paths lolos |

Fase schema/workspace lokal boleh dikerjakan sebelum adapter remote agar data
memiliki stable IDs. Namun urutan **resource integrasi** tetap Encounter,
Condition, lalu Observation. Ketiga adapter tersebut sudah tersedia di codebase;
pekerjaan berikutnya adalah verifikasi sandbox, rekonsiliasi, dan perluasan
klinis yang belum menjadi resource aktif.

## Snapshot status delivery

Pada 19 Agustus 2026, fase lokal inti sudah memiliki fondasi `DRAFT`/`FINAL`,
versioning, preflight, finalisasi atomik, audit event, typed history/Observation,
serta adapter Condition dan Observation. Status remote tetap mengikuti bukti
sandbox, bukan hanya keberadaan adapter atau unit test:

- Encounter: create dan repeat update pernah **PASS** pada run manual sebelumnya;
- Condition: adapter/test **tersedia**, manual rerun **BLOCKED** pada laporan terakhir;
- Observation: adapter/test **tersedia**, manual rerun **BLOCKED** pada laporan terakhir;
- vertical flow otomatis: **PASS**, termasuk recovery untuk RME `FINAL` ketika
  Encounter awal belum linked, repeat update dengan remote ID tetap, final
  immutable, optimistic concurrency, dependency failure, dan plugin disabled;
- sandbox Condition/Observation/Encounter finished: **belum diverifikasi ulang**;
  status remote tidak dinaikkan hanya berdasarkan automated test;
- amendment, outbox klinis, Procedure, MedicationOrder, FollowUpPlan, odontogram,
  dan evidence center masih merupakan pekerjaan target.

## Gate kontrak MVP `OUTPATIENT_GENERAL_V1`

Kontrak minimal untuk alur pendaftaran → Encounter → konsultasi → draft → final
sekarang menjadi batas delivery lokal. Acceptance profile saat ini mencakup:

- konteks Encounter yang valid dan `IN_PROGRESS` dengan actor dokter yang sesuai;
- anamnesis utama, review alergi eksplisit, empat vital inti, pemeriksaan fisik,
  diagnosis utama ICD-10, edukasi, rencana, dan disposisi;
- resep sebagai kelompok opsional, dengan validasi minimal hanya bila baris resep
  diisi.

Riwayat tambahan, vital tambahan, diagnosis sekunder, dan detail resep non-esensial
tetap dapat disimpan tanpa menjadi blocker. Tidak ada schema atau kode baru yang
diperlukan untuk gate ini. Sebelum memperluas profile, owner harus menyelesaikan
review klinis atas kewajiban vital menurut usia/jenis kunjungan, semantik alergi,
serta struktur edukasi/rencana/disposisi.

Pekerjaan yang sengaja tidak masuk gate ini adalah Procedure, MedicationOrder,
FollowUpPlan terstruktur, amendment, outbox klinis, odontogram, dan evidence
center. Item tersebut baru masuk roadmap setelah workflow lokal MVP dan decision
gate klinisnya disetujui.

## Slice implementasi terdekat

### Slice A — hilangkan false clinical data dan bypass finalisasi

Status: **selesai pada snapshot codebase**.

- hapus nilai klinis contoh dari initial state `RmeForm`;
- bedakan placeholder dari value;
- hilangkan/ubah aksi `COMPLETED` langsung di antrean klinis;
- tambahkan regression test bahwa simpan draft tidak menutup Encounter.

Masuk ke PRI-18/PRI-20 dan dapat dilakukan sebelum migration besar karena
bernilai keselamatan langsung.

### Slice B — RME lifecycle

Status: **fondasi selesai; triase klinis dan audit koreksi tersedia; amendment dan outbox masih terbuka**.

- migration `MedicalRecord.status`, `version`, authored/finalized metadata;
- endpoint/command `save draft` dan `finalize` terpisah;
- server-side validation profile;
- optimistic concurrency;
- read-only response untuk final;
- audit untuk create/update/finalize.

Masuk ke PRI-17, PRI-20, dan PRI-21.

### Slice C — Encounter sync lengkap

Status: **implementasi API/plugin dan UI tersedia; verifikasi sandbox masih
terbuka**.

- **Sudah tersedia:** FHIR client `createEncounter` dan `updateEncounter`,
  capability `sync`, dependency preflight, dan mapper version metadata;
- **Sudah tersedia:** persist `ExternalResourceLink` + `SatusehatSyncLog`,
  shared action/badge pada list/detail, dan refresh setelah sukses;
- unit test sukses/failure/repeat sync sudah tersedia; sandbox manual create dan
  repeat update masih menjadi exit gate.

Masuk ke PRI-23; monitor/retry generik dilanjutkan di PRI-24.

### Slice D — model klinis terstruktur

Status: **model typed, Condition adapter, dan Observation adapter tersedia;
perluasan terminology dan validasi sandbox tetap terbuka**.

- **Sudah tersedia:** stable child IDs untuk Diagnosis dan ClinicalObservation,
  Condition adapter dengan preflight setelah dependency Encounter linked,
  Observation adapter dengan preflight setelah dependency Encounter linked, dan
  UI RME untuk sync per diagnosis serta per Observation;
- **Sudah tersedia:** recovery terkontrol untuk RME `FINAL` yang melewatkan sync
  Encounter awal. Plugin membuat proyeksi historis `in-progress`, menyimpan
  linkage, membuat Condition utama, lalu mencoba `PUT Encounter finished` dengan
  remote ID yang sama. Setiap operasi memiliki sync log terpisah dan kegagalan
  remote tidak mengubah RME lokal;
- terminology registry/version dan migrate/read compatibility untuk kolom
  vital/diagnosis lama masih perlu dirapikan sebagai pekerjaan lanjutan.

Masuk ke PRI-19, PRI-23, dan PRI-29.

### Slice E — profil konsultasi gigi lokal

- `serviceProfile` dan `OUTPATIENT_DENTAL_V1`;
- `DentalExam`, `ToothFinding`, `ToothSurfaceFinding`, `OralFinding`,
  `DentalIndex`, dan target diagnosis/tindakan dengan stable IDs;
- visual odontogram FDI + mode daftar, dentisi sulung/permanen/campuran;
- projection longitudinal dari record final, compare prior/current, dan print;
- accessibility, optimistic concurrency, final/read-only, dan amendment;
- adapter gigi tetap menunggu gate Condition/Observation aktif.

Scope ini perlu dipetakan ke issue setelah review dokter gigi; jangan memasukkan
seluruhnya ke PRI-19 tanpa memeriksa ukuran tanggung jawab issue.

### Slice F — fondasi bukti akreditasi

- review akses, amendment, disclosure, retention, backup/restore evidence, serta
  audit kelengkapan RME lebih dahulu;
- versioned standard registry per facility type;
- evidence item dengan owner, period, reviewer, expiry, dan follow-up;
- quality indicator, patient safety incident, risk register, serta document
  register sebagai domain governance terpisah;
- export evidence pack dengan redaction dan audit;
- label internal hanya `accreditation-ready`, tidak pernah klaim Paripurna.

Scope ini memerlukan issue/epic baru setelah owner produk dan target jenis faskes
disepakati. Implementasi tidak boleh menyalin instrumen resmi menjadi hard-code.

## Decision gates sebelum coding resource baru

Untuk setiap resource, pull request harus menuliskan:

1. prerequisite resource/linkage;
2. perilaku saat plugin mati;
3. local write dan stable ID yang menjadi sumber payload;
4. operasi create/update remote dan idempotency key;
5. linkage/log behavior pada sukses dan gagal;
6. UI loading/disabled/error/repeat-sync states;
7. unit/integration test;
8. manual sandbox create + repeat update.

## Risiko yang perlu dijaga

| Risiko | Mitigasi |
| --- | --- |
| Menyalin FHIR menjadi schema lokal | Review aggregate boundary dan mapping adapter |
| RME palsu karena default form | Initial values kosong + test |
| Kunjungan selesai tanpa catatan final | Satu command finalisasi atomik; tidak ada shortcut umum |
| Data final berubah tanpa jejak | Immutability + amendment + audit |
| Sync status palsu | UI membaca persistent linkage saja |
| Duplicate remote resource | Stable local ID, linkage lookup, create/update split |
| Terminologi drift | Registry version + mapper/profile version |
| Provider mengunci core | Plugin boundary + disabled-state build/test |
| Odontogram menjadi gambar/blob | Temuan per Encounter terstruktur + projection longitudinal |
| Semua gigi dianggap sehat | Status review/coverage eksplisit; tidak ada auto-fill klinis |
| Klaim akreditasi menyesatkan | Evidence readiness dipisah dari keputusan survei |
| Instrumen akreditasi berubah | Versioned standard + effective period + source watch |
| Evidence membocorkan data pasien | Minimum necessary, redaction, permission, audit export |

## Review yang dibutuhkan

- dokter: section, mandatory data, dan finalization preflight;
- dokter gigi: nomenklatur FDI, temuan/surface, indeks, tindakan, dan odontogram;
- petugas pendaftaran/rekam medis: identifikasi, antrean, cancellation, print;
- farmasi: medication identity, dosage, order versus dispense;
- keamanan/privasi: permission, audit, retention, sensitive logging;
- engineer: migration compatibility, transaction, outbox, adapter boundary;
- product/design: exception states, responsive behavior, dan copy keselamatan.
- pimpinan faskes/PMKP/pendamping akreditasi: standard version, evidence, owner,
  indikator, risiko, insiden, dan batas klaim kesiapan.
