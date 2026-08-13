# Laporan Manual Sandbox E2E SATUSEHAT - 2026-08-13

Tanggal: 2026-08-13 WIB  
Repository: `mitrafaskes-opensource`  
Commit saat inspeksi: `44e09fc` (`Update RME implementation documentation`)  
Urutan gate: `Organization -> Location -> Practitioner -> Patient -> Encounter -> Condition -> Observation`

## Ringkasan

Status keseluruhan: **PARTIAL / BLOCKED**.

Gate Encounter sebelumnya berhasil dijalankan end-to-end memakai baseline
Organization, Location, Practitioner, dan Patient yang sudah terhubung di
environment sandbox. Create, repeat update, linkage, log, connected badge,
copy external ID, loading/disabled state, dan refresh list berhasil
diverifikasi.

Pada pengulangan implementasi ini ditemukan schema drift: dua migration RME
terakhir belum diterapkan pada database aktif. Migration existing berhasil
diterapkan dan status schema sekarang up to date. Regression test untuk draft
tanpa Observation dan typed quantity Observation juga ditambahkan dan lulus.

Manual Condition/Observation belum dapat diulang setelah perbaikan karena
proses API pada port `4000` dan web pada port `3000` tidak memiliki listener.
Sesuai batasan sesi, agent tidak memulai, merestart, atau mengambil alih
proses tersebut. Practitioner linked yang dipakai pada manual Encounter
sebelumnya juga `dr. Alexander`, bukan akun dokter demo `dr_budi` yang
diperlukan untuk assignment RME.

Tidak ada secrets yang dibaca atau ditampilkan.

## Preflight pengulangan

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| Web UI | BLOCKED | Tidak ada listener pada port `3000`. |
| API | BLOCKED | Tidak ada listener pada port `4000`. |
| Database | PASS | PostgreSQL tersedia pada port `5432`; Prisma melaporkan schema up to date. |
| Migration schema | PASS | Migration `20260813193000_condition_local_mapping_required` dan `20260813200000_observation_typed_child` berhasil diterapkan. |
| Secrets | PASS | Tidak membaca atau menampilkan isi `.env`, token provider, client secret, atau kredensial. |
| Server ownership | PASS | Tidak memulai, menghentikan, merestart, atau mengambil alih proses web/API. |

## Perbaikan implementasi

Pemeriksaan awal Prisma menunjukkan dua migration belum diterapkan:

```text
20260813193000_condition_local_mapping_required
20260813200000_observation_typed_child
```

Keduanya diterapkan dengan migration existing melalui `prisma migrate deploy`.
Pemeriksaan berikutnya melaporkan `Database schema is up to date!`. Tidak ada
migration baru, perubahan schema baru, atau perubahan provider boundary.

Regression test ditambahkan pada
`apps/api/src/rme/rme.draft.spec.ts` untuk memastikan:

- draft kosong tetap tersimpan ketika delegate `ClinicalObservation` tersedia;
- typed quantity Observation baru menyimpan code, value, performer actor,
  effective time, unit, UCUM system, dan UCUM code;
- child Observation tetap diproses sebagai record lokal tanpa memanggil
  provider eksternal.

## Baseline dependency dari manual Encounter sebelumnya

Record berikut sudah linked sebelum Encounter dibuat. Record lokal baru pada
manual Encounter tersebut adalah `ENC-2026-000009`.

| Resource | Local identifier/display | Remote ID sandbox | Status |
|---|---|---|---|
| Organization | `FASKES-UTAMA` / `STAGING mitkonsultanpalembang@gmail.com` | `a43fa518-5f31-401f-8012-5c626641050a` | Linked |
| Location | `Poli Gigi` / code `762125EC-7694-4173-AB7F-6A88830FA44B` | `6208f912-8ab4-4b69-9e31-495ff1895fd8` | Linked |
| Practitioner | `dr. Alexander` / `@dr_alexander` | `10009880728` | Linked |
| Patient | `Siti Aminah` / `RM-2026-000002` | `P20396176300` | Linked |

Baseline ini tetap valid sebagai bukti manual sebelumnya, tetapi belum
memenuhi pilihan rerun RME dengan Practitioner `dr_budi`.

## Matriks hasil manual

| Skenario | Status | Local ID | Remote ID | Operasi | Status setelah refresh | Error terakhir |
|---|---|---|---|---|---|---|
| Organization, Location, Practitioner, Patient linked | PASS pada run sebelumnya | ID/display pada tabel baseline | ID pada tabel baseline | Precondition | Connected badge dan copy ID tersedia | - |
| Encounter sync pertama | PASS pada run sebelumnya | `69e05484-e8b5-4fd6-8f67-4043c7b09c9d` / `ENC-2026-000009` | `132c1f98-1945-4050-ab28-7ef04386bbde` | `CREATE` | Connected setelah reload; timestamp `13 Agu 2026, 19.45` | - |
| Encounter repeat sync | PASS pada run sebelumnya | `69e05484-e8b5-4fd6-8f67-4043c7b09c9d` / `ENC-2026-000009` | ID tetap `132c1f98-1945-4050-ab28-7ef04386bbde` | `UPDATE` | Connected setelah reload; timestamp `13 Agu 2026, 19.46` | - |
| Encounter failure preservation | PARTIAL pada run sebelumnya | `ENC-2026-000005` | Tidak ada linkage sukses pada record tersebut | Preflight blocked | Tetap `Belum tersinkron`; latest error terlihat | `Organization, Location, Practitioner belum terhubung ke SATUSEHAT pada environment sandbox.` |
| Condition diagnosis tunggal setelah migration | BLOCKED - belum diulang | N/A | N/A | N/A | N/A | API/web tidak tersedia; assignment RME `dr_budi` belum disiapkan |
| Observation typed tunggal setelah migration | BLOCKED - belum diulang | N/A | N/A | N/A | N/A | API/web tidak tersedia; assignment RME `dr_budi` belum disiapkan |

### Bukti Encounter create dan update

Pada run sebelumnya, dialog preview pertama menampilkan `Operasi: Buat data
baru`. Monitoring SATUSEHAT mencatat log sukses `CREATE` untuk local resource
ID `69e05484-e8b5-4fd6-8f67-4043c7b09c9d` dengan dependency:

- `Organization/a43fa518-5f31-401f-8012-5c626641050a`;
- `Location/6208f912-8ab4-4b69-9e31-495ff1895fd8`;
- `Practitioner/10009880728`;
- `Patient/P20396176300`.

Preview kedua menampilkan `Operasi: Perbarui data` dan `Repeat sync - remote ID
tetap`. Monitoring mencatat `UPDATE` dengan remote ID yang sama
`132c1f98-1945-4050-ab28-7ef04386bbde`. Connected badge tetap tampil setelah
reload queue.

### Bukti dependency dan UI failure state

Encounter `ENC-2026-000005` menampilkan latest failure tanpa connected badge.
Preview sync memblokir tombol dan menjelaskan bahwa Organization, Location, dan
Practitioner harus dihubungkan terlebih dahulu. Loading menampilkan
`Menyinkronkan...` dengan tombol disabled. Copy external ID dan refresh queue
serta monitoring juga berhasil diverifikasi pada run sebelumnya.

## Condition dan Observation: status blocker terbaru

Schema drift yang sebelumnya berpotensi menyebabkan HTTP 500 sudah diperbaiki
dengan menerapkan migration existing. Namun manual gate belum dapat memastikan
draft dan sync setelah perbaikan karena API/web tidak tersedia.

Selain itu, rerun sesuai rencana memerlukan Encounter baru yang ditugaskan ke
akun dokter `dr_budi` serta Practitioner `dr_budi` yang sudah linked. Data
tersebut belum dibuat atau diubah dalam sesi ini; linkage `dr. Alexander` tidak
dipindahkan dan tidak dipalsukan.

Item berikut masih menunggu rerun manual:

- Condition `CREATE`/`UPDATE`, linkage per diagnosis, dan log;
- terminology invalid yang diblokir sebelum network call;
- Observation code, typed value, unit UCUM, effective time, dan performer;
- Observation `CREATE`/`UPDATE`, linkage per item, serta partial failure;
- connected badge, retry/error, copy ID, dan refresh untuk Condition/Observation.

## Rencana rerun setelah proses tersedia

1. Pastikan API pada `4000` dan web pada `3000` sudah dijalankan oleh operator.
2. Login sebagai dokter RME dan gunakan data baru dengan Organization, Location,
   Practitioner `dr_budi`, dan Patient yang sudah linked.
3. Buat Encounter `IN_PROGRESS` yang ditugaskan ke `dr_budi`.
4. Simpan draft dengan diagnosis ICD-10 aktif `J00` dan Observation suhu:
   code `8310-5`, value quantity `36.7`, unit `Cel`, system
   `http://unitsofmeasure.org`, effective time, dan performer dokter.
5. Sync Condition sekali lalu ulangi; catat `CREATE`, `UPDATE`, linkage, log,
   dan remote ID yang tetap.
6. Sync Observation sekali lalu ulangi; verifikasi payload code/value/unit/time/
   performer, linkage per item, log, dan partial failure pada item invalid.
7. Uji dependency atau terminology invalid dan pastikan provider tidak dipanggil.
8. Refresh list/detail dan catat local ID, remote ID, operasi, status, serta
   error terakhir pada laporan ini.

## Bukti otomatis terbaru

| Gate | Hasil |
|---|---|
| Targeted RME/SATUSEHAT API tests | PASS - 34 suite, 189 test |
| API lint | PASS |
| Web lint | PASS |
| Monorepo build | PASS |
| Prisma migration status | PASS - schema up to date |

Perintah yang dijalankan:

```text
npx prisma migrate deploy --schema ..\\..\\packages\\database\\prisma\\schema.prisma
npx prisma migrate status --schema ..\\..\\packages\\database\\prisma\\schema.prisma
npm --workspace=apps/api test -- --runInBand --testPathPatterns=rme
npm --workspace=apps/api test -- --runInBand --testPathPatterns="rme|satusehat"
npm --workspace=apps/api run lint
npm --workspace=apps/web run lint
npm run build
```

## Kesimpulan gate

- Organization -> Location -> Practitioner -> Patient: **PASS pada run
  Encounter sebelumnya**, belum diulang dengan Practitioner `dr_budi`.
- Encounter create dan repeat update: **PASS pada run sebelumnya**.
- Schema blocker draft RME: **RESOLVED** dengan migration existing.
- Condition: **BLOCKED - manual rerun menunggu API/web dan assignment RME**.
- Observation: **BLOCKED - manual rerun menunggu API/web dan assignment RME**.

Urutan resource tidak diubah. Profil gigi dan governance akreditasi tidak
dikerjakan.
