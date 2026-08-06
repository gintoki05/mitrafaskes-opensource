# Mitra Faskes - Open Source Rekam Medis Elektronik (RME) Indonesia

Aplikasi Rekam Medis Elektronik (RME) Open Source untuk Dokter Praktik Mandiri, Klinik Pratama, dan Fasilitas Kesehatan Tingkat Pertama (FKTP) yang dirancang sesuai **Permenkes No. 24 Tahun 2022** dengan fondasi interoperabilitas **SATUSEHAT Kemenkes RI** (Spesifikasi HL7 FHIR).

## Fitur Utama

1. **Manajemen Pendaftaran & Antrean Pasien**
   - Pencarian Pasien berdasarkan NIK & No. Rekam Medis.
   - Pendaftaran Antrean Rawat Jalan (Poli Umum, Poli Gigi, dll).
2. **Form RME Rawat Jalan Dokter**
   - Anamnesis (Keluhan Utama & Riwayat Penyakit).
   - Pemeriksaan Fisik & Vital Signs (Tekanan Darah, Nadi, Suhu, BB, TB).
   - Auto-complete Diagnosis ICD-10 (Nama Indonesia & Inggris).
   - Input Resep Obat / KFA.
3. **Fondasi Integrasi SATUSEHAT Kemenkes**
   - Transformer Otomatis HL7 FHIR (`Encounter`, `Condition`, `Observation`, `MedicationRequest`).
   - OAuth2 `client_credentials` server-side dengan cache token dan status koneksi.
   - Audit trail dan status sinkronisasi sebagai dasar adapter resource SATUSEHAT berikutnya.
4. **PC Lokal & LAN Ready**
   - Dapat dioperasikan secara lokal di Klinik tanpa bergantung koneksi server eksternal untuk data RME internal.

## Struktur Repository

```text
mitrafaskes-opensource/
├── apps/
│   ├── web/         # Frontend Next.js (App Router, Tailwind CSS, Lucide Icons)
│   └── api/         # Backend API NestJS / Express dengan SATUSEHAT FHIR Engine
├── packages/
│   ├── database/    # Schema Prisma ORM & Seeder Master ICD-10
│   └── shared/      # Shared TypeScript Types, DTOs & FHIR Interfaces
└── docker-compose.yml
```

## Memulai (Quick Start)

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Database Postgres & Seed ICD-10
```bash
docker-compose up -d
npm run db:generate
npm run db:seed
```

### 3. Jalankan Mode Development
```bash
npm run dev:api
npm run dev:web
```

Salin `apps/api/.env.example` menjadi `apps/api/.env` dan `apps/web/.env.example` menjadi `apps/web/.env.local`, lalu sesuaikan `DATABASE_URL` dan `NEXT_PUBLIC_API_URL` untuk environment yang digunakan. Frontend tidak lagi menyimpan alamat API di dalam source code.

Konfigurasi OAuth2 SATUSEHAT tersedia di [`docs/satusehat_authentication.md`](docs/satusehat_authentication.md), sedangkan tahap Organization dan Location ada di [`docs/satusehat_organization.md`](docs/satusehat_organization.md) serta [`docs/satusehat_location.md`](docs/satusehat_location.md).

## Lisensi
[MIT License](LICENSE)
