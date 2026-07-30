# Mitra Faskes - Open Source Rekam Medis Elektronik (RME) Indonesia

Aplikasi Rekam Medis Elektronik (RME) Open Source untuk Dokter Praktik Mandiri, Klinik Pratama, dan Fasilitas Kesehatan Tingkat Pertama (FKTP) yang dirancang sesuai **Permenkes No. 24 Tahun 2022** dan terintegrasi otomatis dengan **SATUSEHAT Kemenkes RI** (Spesifikasi HL7 FHIR).

## Fitur Utama

1. **Manajemen Pendaftaran & Antrean Pasien**
   - Pencarian Pasien berdasarkan NIK & No. Rekam Medis.
   - Pendaftaran Antrean Rawat Jalan (Poli Umum, Poli Gigi, dll).
2. **Form RME Rawat Jalan Dokter**
   - Anamnesis (Keluhan Utama & Riwayat Penyakit).
   - Pemeriksaan Fisik & Vital Signs (Tekanan Darah, Nadi, Suhu, BB, TB).
   - Auto-complete Diagnosis ICD-10 (Nama Indonesia & Inggris).
   - Input Resep Obat / KFA.
3. **SATUSEHAT Kemenkes Sync Engine**
   - Transformer Otomatis HL7 FHIR (`Encounter`, `Condition`, `Observation`, `MedicationRequest`).
   - Audit Trail & Status Sinkronisasi Kemenkes dengan fitur Retry.
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

Akses Frontend di `http://localhost:3000` dan Backend API di `http://localhost:4000`.

## Lisensi
[MIT License](LICENSE)
