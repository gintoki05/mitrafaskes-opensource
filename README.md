# Mitra Faskes - Open Source Rekam Medis Elektronik (RME) Indonesia

Aplikasi Rekam Medis Elektronik (RME) Open Source untuk Dokter Praktik Mandiri, Klinik Pratama, dan Fasilitas Kesehatan Tingkat Pertama (FKTP) yang dirancang sesuai **Permenkes No. 24 Tahun 2022**. Integrasi **SATUSEHAT Kemenkes RI** (HL7 FHIR) tersedia sebagai plugin opsional.

## Fitur Utama

1. **Manajemen Pendaftaran & Antrean Pasien**
   - Pencarian Pasien berdasarkan NIK & No. Rekam Medis.
   - Pendaftaran Antrean Rawat Jalan (Poli Umum, Poli Gigi, dll).
2. **Form RME Rawat Jalan Dokter**
   - Anamnesis (Keluhan Utama & Riwayat Penyakit).
   - Pemeriksaan Fisik & Vital Signs (Tekanan Darah, Nadi, Suhu, BB, TB).
   - Auto-complete Diagnosis ICD-10 (Nama Indonesia & Inggris).
   - Input Resep Obat / KFA.
3. **Integrasi SATUSEHAT Opsional**
   - Nonaktif secara default; aplikasi lokal tetap berjalan tanpa kredensial atau request remote.
   - Capability dan operasi provider memakai gateway generic untuk Organization, Location, Practitioner, dan Patient.
   - OAuth2 server-side, pemetaan FHIR, linkage, dan retry hanya diinisialisasi saat plugin diaktifkan.
4. **PC Lokal & LAN Ready**
   - Dapat dioperasikan secara lokal di Klinik tanpa bergantung koneksi server eksternal untuk data RME internal.

## Struktur Repository

```text
mitrafaskes-opensource/
├── apps/
│   ├── web/         # Frontend Next.js (App Router, Tailwind CSS, Lucide Icons)
│   └── api/         # Backend API NestJS dengan integration core dan plugin opsional
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

Mode default adalah local-first: `INTEGRATION_SATUSEHAT_ENABLED=false`. Dalam mode
ini menu dan action SATUSEHAT disembunyikan, token OAuth/FHIR tidak dibuat, dan
workflow Patient, Practitioner, Master Faskes, Encounter, serta RME tetap dapat
digunakan.

Untuk mengaktifkan plugin pada sandbox, ubah flag berikut di server API dan isi
kredensialnya:

```env
INTEGRATION_SATUSEHAT_ENABLED=true
SATUSEHAT_ENVIRONMENT=sandbox
SATUSEHAT_ORGANIZATION_ID=<organization-id>
SATUSEHAT_CLIENT_ID=<client-id>
SATUSEHAT_CLIENT_SECRET=<client-secret>
```

Capability dan operasi integrasi tersedia melalui gateway generic:

```text
GET  /api/integrations/capabilities
GET  /api/integrations/SATUSEHAT/connection
GET  /api/integrations/SATUSEHAT/logs
POST /api/integrations/SATUSEHAT/resources/{ResourceType}/{id}/sync
```

Provider yang dikenal tetapi nonaktif mengembalikan `503 INTEGRATION_DISABLED`;
provider yang tidak dikenal mengembalikan `404 INTEGRATION_PROVIDER_NOT_FOUND`.
Refactor ini tidak mengaktifkan remote Encounter, outbox, Condition, atau
Observation.

Konfigurasi OAuth2 SATUSEHAT tersedia di [`docs/satusehat_authentication.md`](docs/satusehat_authentication.md), sedangkan operasi Organization, Location, dan Practitioner ada di [`docs/satusehat_organization.md`](docs/satusehat_organization.md), [`docs/satusehat_location.md`](docs/satusehat_location.md), dan [`docs/satusehat_practitioner.md`](docs/satusehat_practitioner.md).

Blueprint produk RME Rawat Jalan, konsultasi gigi/odontogram, model domain,
kamus data klinis, urutan integrasi, kepatuhan akreditasi, dan bahan wireframe
Penpot tersedia di
[`docs/blueprints/rme-rawat-jalan`](docs/blueprints/rme-rawat-jalan/README.md).

## Lisensi
[MIT License](LICENSE)
