# Fondasi Master Data local-first

Master Data adalah domain lokal yang dipakai aplikasi untuk lookup operasional.
SATUSEHAT hanya menjadi referensi standar dan provider refresh manual. Tidak ada
read-through ke provider saat Patient atau form lain dibuka.

## Fase pertama

- IA: `/master-data` untuk overview dataset dan `/master-data/wilayah` untuk
  browser `Provinsi -> Kabupaten/Kota -> Kecamatan -> Desa/Kelurahan`.
- `/master-faskes` tetap menjadi area Organization, Location, Service Unit, dan
  Practitioner.
- `MasterRegion` menyimpan record typed; `MasterDataImportRun` menyimpan
  metadata attempt tanpa payload provider mentah.
- Snapshot baseline version `2026.08-baseline-1` di-seed dari
  `packages/database/prisma/seed-data/master-wilayah.snapshot.ts`.

## Refresh

`POST /api/master-data/regions/refresh` hanya dapat dijalankan Admin. Adapter
SATUSEHAT memakai endpoint Master Data v1 dan dapat di-override dengan
`SATUSEHAT_MASTER_DATA_BASE_URL`; jika kosong, endpoint sandbox/production
dipilih dari `SATUSEHAT_ENVIRONMENT`.

Import memvalidasi duplicate code dan parent hierarchy sebelum transaksi.
Record aktif yang hilang baru ditandai inactive setelah snapshot lengkap berhasil
di-commit. Provider timeout, error, atau response invalid membuat
`MasterDataImportRun=FAILED` dan mempertahankan snapshot aktif terakhir.

Kontrak provider-neutral dan endpoint canonical berada di
`packages/shared/src/types/master-reference.ts` serta controller
`apps/api/src/master-data/master-data-reference.controller.ts`.

## Terminology ICD-10 lokal

`MasterIcd10` adalah snapshot terminology lokal yang dipakai lookup diagnosis
RME. Snapshot canonical disimpan sebagai
`packages/database/prisma/seed-data/master-icd10.snapshot.csv` dan bersumber
dari spreadsheet publik ICD-10 e-klaim yang ditautkan dokumentasi resmi
[Terminologi ICD-10 SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/terminology/icd/icd-10/).
Versi code system yang dipakai adalah `ICD10_2010`, sesuai standar diagnosis
yang dinyatakan SATUSEHAT.

CSV berisi 18.543 kode unik dengan kolom `CODE`, `DISPLAY`, dan `VERSION`.
`DISPLAY` adalah label resmi code system; `nameIndo` hanya opsional untuk
alias lokal yang dikurasi, sedangkan `nameEng` mengikuti `DISPLAY`. Pencarian
RME membaca database lokal melalui `GET /api/master-data/icd10` dengan
permission `master-data.read`; tidak ada read-through ke provider, refresh
otomatis, atau CRUD bebas dari aplikasi.
