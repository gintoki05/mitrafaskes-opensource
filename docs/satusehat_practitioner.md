# Tahap 3 — Practitioner SATUSEHAT

`Practitioner` merepresentasikan tenaga kesehatan lokal yang akan menjadi
referensi pada `Encounter` dan resource klinis lainnya. Implementasi ini
menggunakan data lokal `User` dengan role `DOKTER` atau `PERAWAT`; ID eksternal
SATUSEHAT tetap disimpan di `ExternalResourceLink`.

Referensi resmi:

- [FHIR Practitioner](https://satusehat.kemkes.go.id/platform/docs/id/fhir/resources/practitioner/)
- [REST API Practitioner](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/onboardings/apis/practitioner/)

## Aturan domain

- Data profil lokal tetap dapat diedit tanpa memanggil SATUSEHAT.
- Practitioner lokal dapat merujuk ke `Organization` dan `Location` lokal;
  keduanya opsional, tetapi `Location` harus berada di bawah `Organization`
  yang dipilih.
- NIK lokal bersifat opsional untuk profil lokal, tetapi diperlukan untuk
  pencarian Practitioner melalui Master Nakes Index.
- Alur onboarding Practitioner saat ini menggunakan `GET` pencarian berdasarkan
  `identifier` NIK dan `GET /Practitioner/{id}` untuk detail.
- Sistem hanya melakukan link ke Practitioner yang sudah ada; tidak melakukan
  `POST Practitioner`.
- Satu Practitioner SATUSEHAT tidak boleh terhubung ke dua User lokal.
- Link sukses disimpan dengan:
  - `provider = SATUSEHAT`
  - `resourceType = Practitioner`
  - `localResourceType = User`
  - `localResourceId = User.id`
- Setiap percobaan link dicatat di `SatusehatSyncLog`. Kegagalan tidak menghapus
  linkage sukses sebelumnya.

## Endpoint lokal

Tambah profil Practitioner lokal:

```text
POST /api/practitioners
{
  "username": "dr_alexander",
  "password": "password-awal",
  "fullName": "dr. Alexander",
  "role": "DOKTER",
  "nik": "7209061211900001",
  "birthDate": "1994-01-01",
  "gender": "MALE",
  "organizationId": "{organization-local-id}",
  "locationId": "{location-local-id}",
  "active": true
}
```

`nik` boleh dikosongkan saat membuat profil lokal. Tanpa NIK, Practitioner
tetap dapat digunakan sebagai data lokal tetapi tombol pencarian SATUSEHAT
belum dapat dijalankan.

Daftar tenaga kesehatan:

```text
GET /api/practitioners?search={nama|username|nik}&active=true
```

Cari kandidat SATUSEHAT berdasarkan NIK User lokal:

```text
GET /api/integrations/SATUSEHAT/resources/Practitioner/search?localResourceId={local-id}
```

Hubungkan kandidat yang dipilih:

```text
POST /api/integrations/SATUSEHAT/resources/Practitioner/:id/link
{
  "externalResourceId": "{practitioner-ihs-number}"
}
```

Perbarui metadata Practitioner lokal:

```text
PATCH /api/practitioners/:id
{
  "nik": "{16-digit-nik}",
  "birthDate": "YYYY-MM-DD",
  "gender": "MALE | FEMALE",
  "organizationId": "{organization-local-id}",
  "locationId": "{location-local-id}",
  "active": true
}
```

Semua endpoint integrasi memerlukan sesi lokal dan permission
`sync.status-read` atau `sync.retry` sesuai tindakan. Aktifkan plugin dengan
`INTEGRATION_SATUSEHAT_ENABLED=true`; tanpa flag tersebut provider
mengembalikan `503 INTEGRATION_DISABLED`.

## Urutan penggunaan

1. Buka **Master Faskes → Practitioner / Nakes** sebagai Admin.
2. Edit profil User dokter/perawat dan isi NIK 16 digit.
3. Klik **Cari dan hubungkan Practitioner SATUSEHAT** pada baris yang sesuai.
4. Pilih kandidat dari SATUSEHAT, lalu hubungkan.
5. Pastikan logo/status SATUSEHAT dan ID eksternal tampil setelah daftar dimuat
   ulang.
6. Jika gagal, periksa **Monitoring Sinkronisasi SATUSEHAT**. Status lokal tidak
   boleh berubah menjadi terhubung ketika request remote gagal.

Practitioner yang sudah terhubung menjadi prasyarat sebelum `Encounter` dapat
mengirim referensi `Practitioner/{practitioner-ihs-number}`.
